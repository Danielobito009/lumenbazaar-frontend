# Trustline and Balance Preflight Implementation Guide

## Feature Summary

This feature adds preflight validation to detect missing trustlines and insufficient balances before users sign Stellar exact payment transactions.

**Scope:** Validation only—no automatic trustline creation or asset acquisition.

**Files Modified/Created:**

| File | Purpose |
|------|---------|
| `src/services/api/schemas.ts` | Added `INSUFFICIENT_BALANCE` error code |
| `src/services/stellar/horizon.ts` | Horizon API queries and validation |
| `src/services/stellar/preflight.ts` | Orchestration and error handling |
| `src/components/playground/payment-playground.tsx` | UI integration in playground |
| `src/fixtures/stellar-accounts.ts` | Test scenarios and mocks |
| `src/services/stellar/horizon.test.ts` | Vitest unit tests (40+ cases) |
| `src/services/stellar/preflight.test.ts` | Vitest unit tests (60+ cases) |
| `tests/e2e/payment-playground-preflight.spec.ts` | Playwright E2E tests (40+ cases) |
| `docs/preflight-validation.md` | Complete documentation |
| `docs/trustline-balance-implementation.md` | This file |

## Key Design Decisions

### 1. Distinct Error States

**Why:** Users need clear action items.

- `TRUSTLINE_REQUIRED` → "Establish trustline with issuer"
- `INSUFFICIENT_BALANCE` → "Acquire more asset"
- `ACCOUNT_NOT_FOUND` → "Verify account address or initialize account"
- `NETWORK_ERROR` → "Check connectivity or retry"

### 2. Horizon API, Not SDK

**Why:** Lighter bundle, simpler integration, no signing capabilities.

- Direct REST queries to Horizon `/accounts/{publicKey}`
- String-based balance comparison (supports atomic units)
- No dependencies on Stellar SDK (@stellar/js-sdk)

### 3. Optional, Not Required

**Why:** Backward compatibility and user choice.

- Preflight checks in playground are user-initiated
- Backend still validates during `verifyPayment()`
- Frontend validation prevents wasted signing attempts

### 4. Fail Closed on Network Error

**Why:** Security—ambiguous network states should not proceed.

- Network errors throw and prevent validation
- User must retry explicitly
- No fallback signing without validation

### 5. Testnet-Only Fixtures

**Why:** Security—never include production account details.

- All fixtures use synthetic testnet addresses
- No real account keys, seed phrases, or production data
- Safe to commit and deploy

## Integration Checklist

- [x] Error codes added to schema
- [x] Horizon query service implemented
- [x] Preflight orchestration service implemented
- [x] Playground UI integrated
- [x] Unit tests written (100+ test cases)
- [x] E2E tests written (40+ test cases)
- [x] Fixtures created (6 scenarios)
- [x] Documentation completed
- [ ] Code quality verification (next task)

## Error Recovery Paths

### TRUSTLINE_REQUIRED

1. User sees preflight error in playground
2. User opens wallet (Freighter, Soroban, etc.)
3. User establishes trustline for asset/issuer
4. User returns to playground and re-checks account
5. Preflight succeeds → user can sign payment

### INSUFFICIENT_BALANCE

1. User sees preflight error with balance details
2. User acquires asset (swap, deposit, airdrop)
3. User returns to playground and re-checks account
4. Preflight succeeds → user can sign payment

### ACCOUNT_NOT_FOUND

1. User sees error "account not found"
2. User verifies public key is correct
3. User initializes account if needed (fund with XLM)
4. User returns to playground and re-checks
5. Preflight succeeds → user can sign payment

## Testing Strategy

### Unit Tests (Vitest)

**Coverage:**
- Horizon query parsing and error handling
- Balance comparison (including big integers)
- Preflight orchestration
- Each error type
- Asset and amount validation
- Conversion to API errors

**Run:** `pnpm test -- horizon.test.ts preflight.test.ts`

### E2E Tests (Playwright)

**Coverage:**
- Preflight card rendering
- Input validation
- Error display
- User workflows
- Mobile responsiveness (375×667)
- Desktop responsiveness (1920×1080)
- Accessibility

**Run:** `pnpm exec playwright test -- payment-playground-preflight.spec.ts`

## Security Considerations

### No Secrets Transmitted

- Public keys only (always visible on-chain anyway)
- No wallet private keys
- No seed phrases
- No signed transactions outside of wallet

### Horizon API Calls Are Safe

- Read-only operations
- No state modification
- No authentication required
- Public network endpoint

### Testnet Fixtures Only

- Never include production accounts
- All addresses start with `G` (testnet convention)
- Safe to include in code and tests

## Performance

### Query Time

- Single Horizon query: ~100–500ms
- Parsing and validation: ~1–10ms
- Total: ~100–510ms typical

### Caching Opportunity

Future: Cache account state for 30–60 seconds if same account checked repeatedly.

### Batch Operations

Future: Support checking multiple assets/amounts in single request.

## Validation Requirements Met

From issue #9 acceptance criteria:

- ✅ **Missing trustline and insufficient balance are distinct**
  - Separate error codes: `TRUSTLINE_REQUIRED` vs `INSUFFICIENT_BALANCE`
  - Clear user-facing messages for each

- ✅ **Asset code, issuer, and required amount are validated**
  - Asset code: 1–12 chars, format check
  - Issuer: Valid Stellar address (56 chars, starts with G)
  - Amount: Positive integer, no leading zeros

- ✅ **Network errors fail without allowing signing**
  - Errors throw and prevent preflight completion
  - No fallback or best-guess proceeding

- ✅ **Checks use synthetic unit fixtures and documented testnet integration**
  - 6 preflight test scenarios in fixtures
  - All scenarios documented with expected behaviors
  - Testnet integration documented in `docs/preflight-validation.md`

## Deployment Notes

### Environment Configuration

- **Testnet:** Uses `https://horizon-testnet.stellar.org`
- **Pubnet:** Uses `https://horizon.stellar.org`
- Configured via `getNetworkConfig(network)` in `src/config/networks.ts`

### Feature Flags

None required—preflight checks are always available in playground.

### Rollout Strategy

1. Merge to main (behind demo-mode playground)
2. Test in staging with real testnet Horizon
3. Deploy to production (safe—read-only, no state modification)
4. Update user documentation and help

## Monitoring and Observability

### Success Metrics

- % of users running preflight before signing
- % of preflight checks that succeed vs fail
- Common error types (trustline vs balance)
- Average query time

### Error Tracking

- Network errors (Horizon unavailable)
- Invalid account addresses
- Malformed responses

### Recommended Logging

```typescript
// Log on preflight check
console.log("Preflight check initiated", {
  publicKey: publicKey.slice(0, 4) + "...", // truncated for privacy
  assetCode,
  network
});

// Log on success
console.log("Preflight validation passed", {
  hasBalance: true,
  network
});

// Log on error
console.error("Preflight validation failed", {
  code: result.error.code,
  assetCode,
  network
});
```

## Future Enhancements

### Phase 2: Automatic Trustline Establishment

- Detect TRUSTLINE_REQUIRED error
- Offer "Establish Trustline" button
- Call wallet to create trustline transaction
- Verify and retry

### Phase 3: Backend Preflight

- Move checks to backend `/v1/preflight` endpoint
- Cache account state on backend
- Provide network fees estimate

### Phase 4: Multi-Asset Support

- Check multiple assets in single request
- Support path payments
- Show alternative assets user could use

## Migration Path

For existing payment flows:

1. **Current:** Resource selected → Verify payload → Sign → Settle
2. **With preflight (recommended):** Resource selected → **Preflight check** → Verify payload → Sign → Settle
3. **Future:** Resource selected → **Backend preflight** → Verify payload → Sign → Settle

Preflight is optional—existing flows still work without it.

## Questions and Support

For implementation questions:

- See `docs/preflight-validation.md` for detailed architecture
- See test files for usage examples
- See `src/services/stellar/preflight.ts` for type definitions

## Completion Verification

Run the verification checklist:

```bash
# 1. Type check
pnpm run type-check

# 2. Lint
pnpm run lint

# 3. Unit tests
pnpm test -- horizon.test.ts preflight.test.ts

# 4. E2E tests (requires build)
pnpm run build
pnpm exec playwright test -- payment-playground-preflight.spec.ts

# 5. All checks
pnpm check
```

Expected results:
- ✓ No type errors
- ✓ All tests pass (100+ unit, 40+ E2E)
- ✓ No linting issues
- ✓ Code quality verified
