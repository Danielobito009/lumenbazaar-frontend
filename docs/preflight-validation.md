# Trustline and Balance Preflight Validation

This document describes the trustline and balance preflight validation system for Stellar exact payment flows in LumenBazaar.

## Overview

Before a user signs a payment transaction, the frontend validates that the payer's Stellar account:

1. **Has the required trustline** — The account has established a trust relationship with the asset's issuer
2. **Has sufficient balance** — The account holds enough of the required asset to complete the payment

These checks are **distinct and unambiguous**:
- **Missing trustline** → `TRUSTLINE_REQUIRED` error
- **Insufficient balance** → `INSUFFICIENT_BALANCE` error

Validation **fails closed** — network errors prevent payment signing rather than allowing potentially unverifiable transactions.

## Architecture

### Service Layers

#### Horizon Query Layer (`src/services/stellar/horizon.ts`)

Direct integration with Stellar Horizon API to query account state.

**Functions:**

- `queryAccountInfo(publicKey, network, fetchImpl?)` — Queries account balances and trustlines from Horizon
  - Returns: `StellarAccountInfo` with normalized balances
  - Throws: Error on account not found or network failure

- `validateAccountPreflight(publicKey, assetCode, assetIssuer, requiredAmount, network, fetchImpl?)` — Validates single asset/balance pair
  - Returns: `PreflightValidation` with `hasTrustline`, `balance`, and error state
  - Throws: Error on network failure or malformed response

**Key Implementation Details:**

- Normalizes native XLM (`assetCode: "XLM"`, `assetIssuer: null`) and issued assets
- Compares large balance amounts as strings (supports stroops/atomic units)
- Provides exact error classification without ambiguity

#### Orchestration Layer (`src/services/stellar/preflight.ts`)

High-level preflight checks with comprehensive error handling and validation.

**Functions:**

- `checkPaymentPreflight(options)` — Complete preflight validation
  - Validates asset configuration (code length, issuer address format)
  - Validates amount format (positive integer, no leading zeros, within bounds)
  - Queries account and performs trustline/balance validation
  - Returns: `PreflightCheckResult` with success or typed error

- `preflightCheckErrorToApiError(error)` — Converts to API error format
  - Enables consistent error handling in payment flow
  - Includes asset details and balance information in error details

**Error Types:**

- `TRUSTLINE_REQUIRED` — Account missing trustline for asset
- `INSUFFICIENT_BALANCE` — Account has trustline but insufficient balance
- `ACCOUNT_NOT_FOUND` — Account does not exist on network
- `NETWORK_ERROR` — Horizon API or fetch failure
- `INVALID_ASSET_CONFIG` — Asset code/issuer format invalid
- `INVALID_ASSET_CONFIG` — Amount format invalid

### UI Integration (`src/components/playground/payment-playground.tsx`)

The payment playground displays a dedicated "Preflight Check" card where users can validate their account before initiating payment.

**User Flow:**

1. User selects a paid resource (defines asset code, issuer, required amount)
2. User enters their Stellar public key in the preflight check input
3. User clicks "Check Account"
4. System queries Horizon API asynchronously
5. System displays result:
   - Success: No error message shown, user can proceed
   - Trustline error: Shows `TRUSTLINE_REQUIRED` with asset details
   - Balance error: Shows `INSUFFICIENT_BALANCE` with current and required amounts
   - Network error: Shows `NETWORK_ERROR` with explanation

**UI States:**

- **Ready**: Empty input, button enabled
- **Loading**: "Checking..." button disabled during API call
- **Success**: Input cleared, no error message
- **Error**: Error panel with badge, message, and actionable details

## Error States and Recovery

### TRUSTLINE_REQUIRED

**Condition:** Account has no balance entry for the asset.

**User Action:**
- Establish trustline with asset issuer (via wallet UI or on-chain operation)
- Re-check account in preflight validator
- Return to authorization and sign payment

**Message Format:**
```
Account does not have a trustline for {assetCode} ({assetIssuer}).
Please establish a trustline before attempting payment.
```

**Error Details:**
```json
{
  "code": "TRUSTLINE_REQUIRED",
  "assetCode": "USDC",
  "assetIssuer": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
}
```

### INSUFFICIENT_BALANCE

**Condition:** Account has trustline but balance is less than required amount.

**User Action:**
- Acquire more of the required asset (via exchange, transfer, or airdrop)
- Re-check account in preflight validator
- Return to authorization and sign payment

**Message Format:**
```
Insufficient balance. Required: {requiredAmount}, Available: {currentBalance}
```

**Error Details:**
```json
{
  "code": "INSUFFICIENT_BALANCE",
  "assetCode": "USDC",
  "currentBalance": "50.0000000",
  "requiredAmount": "100000000"
}
```

### ACCOUNT_NOT_FOUND

**Condition:** Account does not exist on the specified network.

**User Action:**
- Verify account address is correct
- Ensure account has been initialized (via lumen funding)
- Use correct network (testnet vs. pubnet)
- Re-check account

**Message Format:**
```
Account {publicKey} not found on {network}.
Please ensure the account has been initialized.
```

**Error Details:**
```json
{
  "code": "ACCOUNT_NOT_FOUND",
  "publicKey": "GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y"
}
```

### NETWORK_ERROR

**Condition:** Horizon API is unreachable or returns unexpected response.

**User Action:**
- Verify internet connectivity
- Check Horizon API status (https://stellar.org/status for pubnet)
- Retry preflight check

**Message Format:**
```
Network error during preflight check: {specificError}
```

### INVALID_ASSET_CONFIG

**Condition:** Resource configuration has invalid asset code or issuer.

**Causes:**
- Asset code longer than 12 characters
- Asset code is empty string for non-native asset
- Asset issuer is not a valid Stellar address
- Required amount is not a positive integer

**Message Format:**
```
{specificValidationError}
```

**Examples:**
- "Asset code must not exceed 12 characters"
- "Asset issuer is required for non-native assets"
- "Asset issuer must be a valid Stellar address"
- "Amount must be a positive integer without leading zeros"

## Testing

### Unit Tests (`src/services/stellar/horizon.test.ts`)

Tests for Horizon query layer:
- Account info parsing and normalization
- Balance detection and comparison
- Error handling (404, 500, network failures)
- Big integer balance comparison
- Native XLM vs issued asset handling

### Unit Tests (`src/services/stellar/preflight.test.ts`)

Tests for preflight orchestration:
- Complete validation workflow
- Each error type (trustline, balance, account not found, network, invalid config)
- Validation of asset configuration
- Validation of amount format
- Error to API error conversion

### E2E Tests (`tests/e2e/payment-playground-preflight.spec.ts`)

Tests for UI integration:
- Preflight check card rendering
- Input validation and interaction
- Error display and styling
- User workflow (multiple checks, switching resources)
- Mobile responsiveness (375×667 viewport)
- Desktop responsiveness (1920×1080 viewport)
- Accessibility (keyboard navigation, ARIA labels)

### Test Fixtures (`src/fixtures/stellar-accounts.ts`)

Synthetic testnet account scenarios:
1. **sufficientBalance** — Account with USDC trustline and balance > required
2. **insufficientBalance** — Account with USDC trustline but balance < required
3. **noTrustline** — Account with no USDC trustline (XLM only)
4. **nativeOnly** — Account with only XLM, no issued asset trustlines
5. **nativeXLMBalance** — Validation of native XLM with sufficient balance
6. **insufficientXLM** — Validation of native XLM with insufficient balance

Mock implementations:
- `createScenarioMockFetch()` — Interceptor for all test scenarios
- `createMockHorizonFetch(scenarios)` — Custom scenario mocks
- Response builders for 200, 404, 500 status codes

## Implementation Constraints

### Security

- **No seed phrases or private keys** in preflight validation
- **Public key validation only** (no account modification)
- **Read-only Horizon queries** (no transaction signing)
- **Explicit public testnet data** (never production account details)

### Network Behavior

- **Horizon API queries only** (via standard REST endpoints)
- **Configurable network** (testnet or pubnet)
- **Timeout protection** (default 30 seconds per query)
- **Fail closed** on network error (does not proceed with signing)

### Asset Support

- **Native XLM** (`assetCode: "XLM"`, empty issuer)
- **Issued assets** on testnet and pubnet (12-char code, 56-char issuer address)
- **No automatic trustline creation** (user responsibility)
- **No automatic asset acquisition** (user responsibility)

## Integration with Payment Flow

The preflight checks are **optional** in the current implementation but **recommended** before calling `verifyPayment()`.

**Current flow (without preflight):**
1. User enters public key → builds payment payload → signs in wallet → calls `verifyPayment()`
2. Backend validates payment → returns success or error
3. If backend returns `TRUSTLINE_REQUIRED` or amount mismatch → payment fails

**Recommended flow (with preflight):**
1. User enters public key → preflight check validates account state
2. If check succeeds → user builds payment payload → signs in wallet → calls `verifyPayment()`
3. If check fails → user adjusts account (establishes trustline or acquires asset) → retries

## Future Enhancements

1. **Automatic trustline suggestions** — Offer UI to establish trustline via wallet
2. **Backend integration** — Move preflight to server-side verification (optional)
3. **Stellar SDK integration** — Use official SDK instead of direct Horizon queries
4. **Caching** — Cache account state briefly to reduce Horizon load
5. **Batch validation** — Support multiple assets/amounts in single check
6. **Multi-path payments** — Detect when user has asset via different path

## Running Tests

### Vitest Unit Tests

```bash
# Run all unit tests
pnpm test

# Run preflight tests only
pnpm test -- preflight.test.ts horizon.test.ts

# Run with coverage
pnpm test -- --coverage
```

### Playwright E2E Tests

```bash
# Run all E2E tests
pnpm exec playwright test

# Run preflight tests only
pnpm exec playwright test -- payment-playground-preflight.spec.ts

# Run in headed mode (see browser)
pnpm exec playwright test -- --headed

# Run on specific browser
pnpm exec playwright test -- --project=chromium
```

## Code Examples

### Basic Preflight Check

```typescript
import { checkPaymentPreflight } from "@/services/stellar/preflight";

const result = await checkPaymentPreflight({
  publicKey: "GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG",
  assetCode: "USDC",
  assetIssuer: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  requiredAmount: "50000000", // 50 USDC in stroops
  network: "stellar:testnet"
});

if (result.success) {
  console.log("✓ Account has trustline and sufficient balance");
  console.log(`  Balance: ${result.validation.balance}`);
} else {
  console.error(`✗ Validation failed: ${result.error.code}`);
  console.error(`  Message: ${result.error.message}`);
}
```

### Handling Specific Errors

```typescript
if (!result.success) {
  switch (result.error.code) {
    case "TRUSTLINE_REQUIRED":
      showError(`Please establish a trustline for ${result.error.assetCode}`);
      break;
    case "INSUFFICIENT_BALANCE":
      showError(`Need ${result.error.requiredAmount}, you have ${result.error.currentBalance}`);
      break;
    case "ACCOUNT_NOT_FOUND":
      showError("Account not found. Please check your public key.");
      break;
    case "NETWORK_ERROR":
      showError("Network error. Please try again later.");
      break;
    default:
      showError(result.error.message);
  }
}
```

### With Custom Fetch Implementation

```typescript
const result = await checkPaymentPreflight({
  publicKey: userAccount,
  assetCode: "USDC",
  assetIssuer: issuerAddress,
  requiredAmount: paymentAmount,
  network: "stellar:testnet",
  fetchImpl: customFetch // Use alternative fetch implementation
});
```

## Validation Evidence

The implementation validates:

- ✓ **Asset code format** — 1–12 ASCII characters, no leading/trailing spaces
- ✓ **Asset issuer format** — Valid Stellar public address (56 chars, starts with G)
- ✓ **Required amount format** — Positive integer, no leading zeros, ≤ max safe integer
- ✓ **Account existence** — 404 response indicates account not found
- ✓ **Trustline presence** — Checked via balance entry in account data
- ✓ **Balance sufficiency** — String-based big integer comparison
- ✓ **Native vs issued** — Separate handling for XLM vs contract-issued assets
- ✓ **Network correctness** — Queries correct Horizon endpoint (testnet/pubnet)

## References

- [Stellar Horizon API Documentation](https://developers.stellar.org/docs/data/horizon)
- [Stellar Assets](https://developers.stellar.org/docs/learn/glossary#asset)
- [Stellar Trustlines](https://developers.stellar.org/docs/learn/glossary#trustline)
- [x402 v2 Specification](https://github.com/bnb-chain/bnb-chain-specification)
