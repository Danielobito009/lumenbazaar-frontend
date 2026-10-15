import { getNetworkConfig, type NetworkId } from "@/config/networks";

/**
 * Represents a Stellar account balance.
 * Includes both native lumens and issued assets.
 */
export type StellarBalance = {
  assetCode: string;
  assetIssuer: string | null; // null for native XLM
  balance: string;
  limit: string; // Maximum balance for trustlines; "unlimited" for native
};

/**
 * Represents Stellar account information from Horizon API.
 */
export type StellarAccountInfo = {
  id: string;
  sequence: string;
  balances: StellarBalance[];
};

/**
 * Represents trustline and balance validation results.
 */
export type PreflightValidation = {
  hasTrustline: boolean;
  balance: string | null;
  error: "TRUSTLINE_REQUIRED" | "INSUFFICIENT_BALANCE" | null;
  assetCode: string;
  assetIssuer: string;
  requiredAmount: string;
};

/**
 * Query account information from Stellar Horizon API.
 * @param publicKey - The Stellar account public key (G...)
 * @param network - The Stellar network (testnet or pubnet)
 * @param fetchImpl - Optional fetch implementation override
 * @returns Account information including balances
 * @throws Error if account not found or network error
 */
export async function queryAccountInfo(
  publicKey: string,
  network: NetworkId,
  fetchImpl: typeof fetch = fetch
): Promise<StellarAccountInfo> {
  const networkConfig = getNetworkConfig(network);
  const url = `${networkConfig.horizonUrl}/accounts/${encodeURIComponent(publicKey)}`;

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      method: "GET"
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Account ${publicKey} not found on ${network}`);
      }
      throw new Error(`Horizon API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;
    const accountData = parseAccountResponse(data);
    return accountData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query account ${publicKey}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate that an account has the required trustline and sufficient balance.
 * @param publicKey - The payer's Stellar account
 * @param assetCode - Asset code (e.g., "USDC")
 * @param assetIssuer - Asset issuer account (or empty string for native XLM)
 * @param requiredAmount - Amount required (in stroops for native, or atomic units)
 * @param network - Stellar network
 * @param fetchImpl - Optional fetch implementation override
 * @returns Validation result with error if checks fail
 */
export async function validateAccountPreflight(
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
  requiredAmount: string,
  network: NetworkId,
  fetchImpl: typeof fetch = fetch
): Promise<PreflightValidation> {
  try {
    const account = await queryAccountInfo(publicKey, network, fetchImpl);

    const isNativeAsset = assetCode === "XLM" || assetIssuer === "";
    const balance = findBalance(account.balances, assetCode, isNativeAsset ? null : assetIssuer);

    if (balance === null) {
      return {
        assetCode,
        assetIssuer,
        balance: null,
        error: "TRUSTLINE_REQUIRED",
        hasTrustline: false,
        requiredAmount
      };
    }

    const hassufficientBalance = compareBigInt(balance.balance, requiredAmount) >= 0;
    if (!hassufficientBalance) {
      return {
        assetCode,
        assetIssuer,
        balance: balance.balance,
        error: "INSUFFICIENT_BALANCE",
        hasTrustline: true,
        requiredAmount
      };
    }

    return {
      assetCode,
      assetIssuer,
      balance: balance.balance,
      error: null,
      hasTrustline: true,
      requiredAmount
    };
  } catch (error) {
    // Network errors are treated as validation failures
    throw new Error(
      `Preflight validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Find a balance in the account's balance list.
 * Returns null if the balance is not found (trustline missing).
 */
function findBalance(
  balances: StellarBalance[],
  assetCode: string,
  assetIssuer: string | null
): StellarBalance | null {
  return (
    balances.find((b) => b.assetCode === assetCode && b.assetIssuer === assetIssuer) ?? null
  );
}

/**
 * Parse Horizon API account response.
 * Extracts balances in a normalized format.
 */
function parseAccountResponse(data: unknown): StellarAccountInfo {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid Horizon API response: expected object");
  }

  const account = data as Record<string, unknown>;
  const id = account.id;
  const sequence = account.sequence;
  const balances = account.balances;

  if (typeof id !== "string" || typeof sequence !== "string" || !Array.isArray(balances)) {
    throw new Error("Invalid Horizon API response: missing required fields");
  }

  return {
    balances: balances.map((balance: unknown) => parseBalance(balance)),
    id,
    sequence
  };
}

/**
 * Parse individual balance entry from Horizon API.
 * Normalizes native and asset balances.
 */
function parseBalance(data: unknown): StellarBalance {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid balance entry: expected object");
  }

  const balance = data as Record<string, unknown>;
  const balanceAmount = balance.balance;
  const assetType = balance.asset_type;
  const assetCode = balance.asset_code;
  const assetIssuer = balance.asset_issuer;
  const limit = balance.limit;

  if (typeof balanceAmount !== "string") {
    throw new Error("Invalid balance entry: balance must be string");
  }

  if (assetType === "native") {
    return {
      assetCode: "XLM",
      assetIssuer: null,
      balance: balanceAmount,
      limit: "unlimited"
    };
  }

  if (typeof assetCode !== "string" || typeof assetIssuer !== "string") {
    throw new Error("Invalid balance entry: missing asset_code or asset_issuer");
  }

  if (typeof limit !== "string") {
    throw new Error("Invalid balance entry: limit must be string");
  }

  return {
    assetCode,
    assetIssuer,
    balance: balanceAmount,
    limit
  };
}

/**
 * Compare two big integers represented as strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 *
 * Handles string representations of large numbers by:
 * 1. Removing leading zeros
 * 2. Comparing string lengths (longer is bigger for positive numbers)
 * 3. Comparing lexicographically if same length
 */
function compareBigInt(a: string, b: string): number {
  const aTrimmed = a.replace(/^0+/, "") || "0";
  const bTrimmed = b.replace(/^0+/, "") || "0";

  if (aTrimmed.length > bTrimmed.length) return 1;
  if (aTrimmed.length < bTrimmed.length) return -1;
  if (aTrimmed > bTrimmed) return 1;
  if (aTrimmed < bTrimmed) return -1;
  return 0;
}
