/**
 * Synthetic Stellar testnet account fixtures for preflight validation testing.
 * These fixtures represent common account states on testnet that can be used
 * for testing trustline and balance validation.
 */

import type { StellarAccountInfo, StellarBalance } from "@/services/stellar/horizon";

/**
 * Public key for account with sufficient USDC balance and trustline.
 * Used as baseline for successful preflight checks.
 */
export const TESTNET_ACCOUNT_SUFFICIENT_BALANCE =
  "GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG";

/**
 * Public key for account with USDC trustline but insufficient balance.
 * Used for testing INSUFFICIENT_BALANCE error scenario.
 */
export const TESTNET_ACCOUNT_INSUFFICIENT_BALANCE =
  "GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K";

/**
 * Public key for account without USDC trustline.
 * Used for testing TRUSTLINE_REQUIRED error scenario.
 */
export const TESTNET_ACCOUNT_NO_TRUSTLINE =
  "GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y";

/**
 * Public key for account with only XLM balance.
 * Used for testing native asset handling.
 */
export const TESTNET_ACCOUNT_NATIVE_ONLY =
  "GBZXN7PIRZGNMHGAIQW7QEJWW36L5CVVNRYANMDW2G3QOF2VCR4DQSQE";

/**
 * Public key for non-existent account.
 * Used for testing ACCOUNT_NOT_FOUND error scenario.
 */
export const TESTNET_ACCOUNT_NOT_FOUND =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * USDC asset issuer on testnet.
 * This is a synthetic issuer address used in test fixtures.
 */
export const TESTNET_USDC_ISSUER =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * Horizon API response for account with sufficient USDC balance.
 * Represents an account that passes preflight validation.
 */
export function createAccountWithSufficientBalance(): StellarAccountInfo {
  return {
    balances: [
      {
        assetCode: "XLM",
        assetIssuer: null,
        balance: "100.0000000",
        limit: "unlimited"
      },
      {
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        balance: "1000.0000000",
        limit: "10000.0000000"
      }
    ],
    id: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
    sequence: "12345678901234567"
  };
}

/**
 * Horizon API response for account with insufficient USDC balance.
 * Represents an account that fails preflight due to insufficient balance.
 */
export function createAccountWithInsufficientBalance(): StellarAccountInfo {
  return {
    balances: [
      {
        assetCode: "XLM",
        assetIssuer: null,
        balance: "100.0000000",
        limit: "unlimited"
      },
      {
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        balance: "10.0000000", // Only 10 USDC
        limit: "10000.0000000"
      }
    ],
    id: TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
    sequence: "12345678901234568"
  };
}

/**
 * Horizon API response for account without USDC trustline.
 * Represents an account that fails preflight due to missing trustline.
 */
export function createAccountWithoutTrustline(): StellarAccountInfo {
  return {
    balances: [
      {
        assetCode: "XLM",
        assetIssuer: null,
        balance: "100.0000000",
        limit: "unlimited"
      }
      // No USDC balance/trustline
    ],
    id: TESTNET_ACCOUNT_NO_TRUSTLINE,
    sequence: "12345678901234569"
  };
}

/**
 * Horizon API response for account with only native XLM.
 * Represents a new account with no issued asset trustlines.
 */
export function createAccountNativeOnly(): StellarAccountInfo {
  return {
    balances: [
      {
        assetCode: "XLM",
        assetIssuer: null,
        balance: "50.0000000",
        limit: "unlimited"
      }
    ],
    id: TESTNET_ACCOUNT_NATIVE_ONLY,
    sequence: "12345678901234570"
  };
}

/**
 * Mock Horizon API fetch response for account with sufficient balance.
 * Used for testing fetch-based account queries.
 */
export function createHorizonResponseSufficientBalance(): Response {
  const body = JSON.stringify(createAccountWithSufficientBalance());
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}

/**
 * Mock Horizon API fetch response for account not found (404).
 * Used for testing account lookup failures.
 */
export function createHorizonResponse404(): Response {
  const body = JSON.stringify({
    status: 404,
    title: "Resource Not Found",
    type: "https://stellar.org/horizon-errors/not-found"
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
    status: 404
  });
}

/**
 * Mock Horizon API fetch response for server error (500).
 * Used for testing network error handling.
 */
export function createHorizonResponse500(): Response {
  const body = JSON.stringify({
    status: 500,
    title: "Internal Server Error",
    type: "https://stellar.org/horizon-errors/server-error"
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
    status: 500
  });
}

/**
 * Test scenarios for preflight validation.
 * Each scenario includes expected input and output for testing.
 */
export const preflightTestScenarios = {
  /**
   * Account has sufficient USDC balance and trustline.
   * Expected: Validation passes without errors.
   */
  sufficientBalance: {
    account: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
    accountInfo: createAccountWithSufficientBalance(),
    requiredAmount: "50000000", // 50 USDC in stroops
    expectedError: null,
    expectedHasTrustline: true,
    description: "Account with sufficient USDC balance passes validation"
  },

  /**
   * Account has USDC trustline but insufficient balance.
   * Expected: INSUFFICIENT_BALANCE error.
   */
  insufficientBalance: {
    account: TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
    accountInfo: createAccountWithInsufficientBalance(),
    requiredAmount: "50000000", // 50 USDC, account only has 10
    expectedError: "INSUFFICIENT_BALANCE",
    expectedHasTrustline: true,
    description: "Account with insufficient balance fails validation"
  },

  /**
   * Account lacks USDC trustline entirely.
   * Expected: TRUSTLINE_REQUIRED error.
   */
  noTrustline: {
    account: TESTNET_ACCOUNT_NO_TRUSTLINE,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
    accountInfo: createAccountWithoutTrustline(),
    requiredAmount: "50000000",
    expectedError: "TRUSTLINE_REQUIRED",
    expectedHasTrustline: false,
    description: "Account without trustline fails validation"
  },

  /**
   * Account with only XLM, checking for issued asset.
   * Expected: TRUSTLINE_REQUIRED error.
   */
  nativeOnly: {
    account: TESTNET_ACCOUNT_NATIVE_ONLY,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
    accountInfo: createAccountNativeOnly(),
    requiredAmount: "50000000",
    expectedError: "TRUSTLINE_REQUIRED",
    expectedHasTrustline: false,
    description: "Account with only native XLM fails for issued asset"
  },

  /**
   * Native XLM payment validation.
   * Expected: Validation passes if account has sufficient XLM.
   */
  nativeXLMBalance: {
    account: TESTNET_ACCOUNT_NATIVE_ONLY,
    assetCode: "XLM",
    assetIssuer: "",
    accountInfo: createAccountNativeOnly(),
    requiredAmount: "10000000", // 1 XLM in stroops
    expectedError: null,
    expectedHasTrustline: true,
    description: "Native XLM payment validation passes with sufficient balance"
  },

  /**
   * Insufficient XLM balance.
   * Expected: INSUFFICIENT_BALANCE error.
   */
  insufficientXLM: {
    account: TESTNET_ACCOUNT_NATIVE_ONLY,
    assetCode: "XLM",
    assetIssuer: "",
    accountInfo: createAccountNativeOnly(),
    requiredAmount: "100000000000000", // Unreasonably large amount
    expectedError: "INSUFFICIENT_BALANCE",
    expectedHasTrustline: true,
    description: "Native XLM payment fails with insufficient balance"
  }
};

/**
 * Type for test scenario keys.
 */
export type PreflightTestScenarioKey = keyof typeof preflightTestScenarios;

/**
 * Mock fetch implementation for testing.
 * Returns synthetic Horizon API responses based on account public key.
 */
export function createMockHorizonFetch(
  scenarios: Record<string, StellarAccountInfo>
): typeof fetch {
  return async (url: string) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    const accountMatch = urlStr.match(/\/accounts\/([^/?]+)/);

    if (!accountMatch) {
      return createHorizonResponse500();
    }

    const publicKey = decodeURIComponent(accountMatch[1]);

    if (publicKey === TESTNET_ACCOUNT_NOT_FOUND) {
      return createHorizonResponse404();
    }

    const scenario = scenarios[publicKey];
    if (!scenario) {
      return createHorizonResponse404();
    }

    const body = JSON.stringify(scenario);
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };
}

/**
 * Create a mock fetch that returns test scenario responses.
 * Useful for integration testing preflight validation.
 */
export function createScenarioMockFetch(): typeof fetch {
  const scenarios: Record<string, StellarAccountInfo> = {
    [TESTNET_ACCOUNT_SUFFICIENT_BALANCE]: createAccountWithSufficientBalance(),
    [TESTNET_ACCOUNT_INSUFFICIENT_BALANCE]: createAccountWithInsufficientBalance(),
    [TESTNET_ACCOUNT_NO_TRUSTLINE]: createAccountWithoutTrustline(),
    [TESTNET_ACCOUNT_NATIVE_ONLY]: createAccountNativeOnly()
  };

  return createMockHorizonFetch(scenarios);
}
