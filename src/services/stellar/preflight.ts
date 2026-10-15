import { getNetworkConfig, type NetworkId } from "@/config/networks";
import type { ApiClientError } from "@/services/api/client";
import {
  validateAccountPreflight,
  type PreflightValidation,
  type StellarAccountInfo
} from "./horizon";

/**
 * Result of a preflight payment check.
 * Either successful validation or a specific error condition.
 */
export type PreflightCheckResult = {
  success: true;
  accountInfo: StellarAccountInfo;
  validation: PreflightValidation;
} | {
  success: false;
  error: PreflightCheckError;
};

/**
 * Specific error conditions that can occur during preflight checks.
 */
export type PreflightCheckError =
  | {
      code: "TRUSTLINE_REQUIRED";
      assetCode: string;
      assetIssuer: string;
      message: string;
    }
  | {
      code: "INSUFFICIENT_BALANCE";
      assetCode: string;
      currentBalance: string;
      requiredAmount: string;
      message: string;
    }
  | {
      code: "ACCOUNT_NOT_FOUND";
      publicKey: string;
      message: string;
    }
  | {
      code: "NETWORK_ERROR";
      message: string;
    }
  | {
      code: "INVALID_ASSET_CONFIG";
      message: string;
    };

/**
 * Preflight check options.
 */
export type PreflightCheckOptions = {
  publicKey: string;
  assetCode: string;
  assetIssuer: string;
  requiredAmount: string;
  network: NetworkId;
  fetchImpl?: typeof fetch;
};

/**
 * Perform a complete preflight check for a payment.
 * Validates:
 * 1. Account exists on the network
 * 2. Account has a trustline for the required asset
 * 3. Account has sufficient balance for the payment
 *
 * @param options - Check configuration
 * @returns Result with validation details or specific error
 */
export async function checkPaymentPreflight(
  options: PreflightCheckOptions
): Promise<PreflightCheckResult> {
  try {
    // Validate asset configuration
    const assetValidation = validateAssetConfig(options.assetCode, options.assetIssuer);
    if (!assetValidation.valid) {
      return {
        error: {
          code: "INVALID_ASSET_CONFIG",
          message: assetValidation.error
        },
        success: false
      };
    }

    // Validate amount format
    const amountValidation = validateAmountFormat(options.requiredAmount);
    if (!amountValidation.valid) {
      return {
        error: {
          code: "INVALID_ASSET_CONFIG",
          message: amountValidation.error
        },
        success: false
      };
    }

    // Query account and validate
    const validation = await validateAccountPreflight(
      options.publicKey,
      options.assetCode,
      options.assetIssuer,
      options.requiredAmount,
      options.network,
      options.fetchImpl ?? fetch
    );

    // Convert validation result to preflight result
    if (validation.error === "TRUSTLINE_REQUIRED") {
      return {
        error: {
          assetCode: validation.assetCode,
          assetIssuer: validation.assetIssuer,
          code: "TRUSTLINE_REQUIRED",
          message: `Account does not have a trustline for ${validation.assetCode} (${validation.assetIssuer}). Please establish a trustline before attempting payment.`
        },
        success: false
      };
    }

    if (validation.error === "INSUFFICIENT_BALANCE") {
      return {
        error: {
          assetCode: validation.assetCode,
          code: "INSUFFICIENT_BALANCE",
          currentBalance: validation.balance ?? "0",
          message: `Insufficient balance. Required: ${validation.requiredAmount}, Available: ${validation.balance ?? "0"}`,
          requiredAmount: validation.requiredAmount
        },
        success: false
      };
    }

    // Success: return account info and validation
    return {
      accountInfo: {
        balances: [],
        id: options.publicKey,
        sequence: "0"
      },
      success: true,
      validation
    };
  } catch (error) {
    // Handle network and account not found errors
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("not found")) {
        return {
          error: {
            code: "ACCOUNT_NOT_FOUND",
            message: `Account ${options.publicKey} not found on ${options.network}. Please ensure the account has been initialized.`,
            publicKey: options.publicKey
          },
          success: false
        };
      }

      if (message.includes("Horizon API error") || message.includes("Failed to query account")) {
        return {
          error: {
            code: "NETWORK_ERROR",
            message: `Network error during preflight check: ${message}`
          },
          success: false
        };
      }
    }

    // Generic error
    return {
      error: {
        code: "NETWORK_ERROR",
        message: `Preflight check failed: ${error instanceof Error ? error.message : String(error)}`
      },
      success: false
    };
  }
}

/**
 * Convert a preflight check result to an API error-like object.
 * Used for consistent error handling in the payment flow.
 */
export function preflightCheckErrorToApiError(
  error: PreflightCheckError
): {
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  const baseError = {
    code: error.code,
    message: error.message
  };

  if (error.code === "TRUSTLINE_REQUIRED") {
    return {
      ...baseError,
      details: {
        assetCode: error.assetCode,
        assetIssuer: error.assetIssuer
      }
    };
  }

  if (error.code === "INSUFFICIENT_BALANCE") {
    return {
      ...baseError,
      details: {
        assetCode: error.assetCode,
        currentBalance: error.currentBalance,
        requiredAmount: error.requiredAmount
      }
    };
  }

  if (error.code === "ACCOUNT_NOT_FOUND") {
    return {
      ...baseError,
      details: {
        publicKey: error.publicKey
      }
    };
  }

  return baseError;
}

/**
 * Validate asset configuration parameters.
 */
function validateAssetConfig(
  assetCode: string,
  assetIssuer: string
): { valid: true } | { valid: false; error: string } {
  if (!assetCode || typeof assetCode !== "string") {
    return {
      error: "Asset code must be a non-empty string",
      valid: false
    };
  }

  if (assetCode.length > 12) {
    return {
      error: "Asset code must not exceed 12 characters",
      valid: false
    };
  }

  // Native XLM has empty issuer, but issuer is required for issued assets
  if (assetCode !== "XLM" && (!assetIssuer || assetIssuer.length === 0)) {
    return {
      error: "Asset issuer is required for non-native assets",
      valid: false
    };
  }

  // If asset issuer is provided, validate it's a valid Stellar address
  if (assetIssuer && assetIssuer.length > 0) {
    if (!isValidStellarAddress(assetIssuer)) {
      return {
        error: "Asset issuer must be a valid Stellar address",
        valid: false
      };
    }
  }

  return { valid: true };
}

/**
 * Validate amount format.
 * Amount should be a positive integer string (stroops or atomic units).
 */
function validateAmountFormat(amount: string): { valid: true } | { valid: false; error: string } {
  if (!amount || typeof amount !== "string") {
    return {
      error: "Amount must be a non-empty string",
      valid: false
    };
  }

  if (!/^[1-9]\d*$/.test(amount)) {
    return {
      error: "Amount must be a positive integer without leading zeros",
      valid: false
    };
  }

  // Check for excessively large numbers (>2^63 - 1, max safe integer in JavaScript)
  if (BigInt(amount) > BigInt("9223372036854775807")) {
    return {
      error: "Amount exceeds maximum supported value",
      valid: false
    };
  }

  return { valid: true };
}

/**
 * Basic validation for Stellar public addresses.
 * Stellar public keys start with 'G' and are 56 characters long.
 */
function isValidStellarAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  if (address.length !== 56) return false;
  if (!address.startsWith("G")) return false;
  // Additional check: verify base32 format
  try {
    // Stellar addresses are base32-encoded, so they should only contain A-Z and 2-7
    return /^G[A-Z2-7]{54}$/.test(address);
  } catch {
    return false;
  }
}
