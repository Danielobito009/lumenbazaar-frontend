# LumenBazaar Frontend Implementation Plan

Source document: `../LUMENBAZAAR_FULL_PROJECT_DOCUMENTATION.md`

Repo role: the public web application for resource discovery, seller onboarding, payment testing, settlement inspection, operator visibility, and reviewer evidence.

Primary stack:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or equivalent component system
- TanStack Query
- Zod
- Stellar Wallets Kit
- Freighter support

Core pages:

- `/`
- `/explore`
- `/resources/[resourceId]`
- `/seller`
- `/seller/new-resource`
- `/seller/resources`
- `/seller/payments`
- `/playground`
- `/transactions`
- `/operators`
- `/operators/health`
- `/operators/conformance`
- `/docs`
- `/settings`

Implementation rules:

- Keep each phase small enough for one focused pull request.
- Use backend OpenAPI or generated schemas as the source of truth when available.
- Do not claim official Stellar, SDF, or SCF endorsement.
- Build testnet flows first.
- Show machine-readable errors clearly.
- Keep wallet and payment logic non-custodial.

## Phase 1: Repository Foundation

Parts:

- Scaffold the Next.js TypeScript application.
- Add Tailwind CSS and the selected component system.
- Add `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `.editorconfig`.
- Add `.gitignore`, PR template, issue template, and GitHub Actions CI.

Completion check:

- Fresh clone can install dependencies, run lint, and start the dev server.

## Phase 2: App Shell

Parts:

- Create the global layout.
- Add top navigation for dashboard, explore, seller, playground, transactions, operators, docs, and settings.
- Add responsive container rules.
- Add shared loading, empty, and error surfaces.

Completion check:

- Every planned route renders a placeholder page without layout shifts.

## Phase 3: Runtime Configuration

Parts:

- Define frontend environment variables.
- Add network configuration for `stellar:testnet` and `stellar:pubnet`.
- Add facilitator API base URL configuration.
- Add feature flags for mainnet, `upto` sessions, and MCP tool inspection.

Completion check:

- Invalid or missing required configuration fails with a clear local error.

## Phase 4: Typed API Client

Parts:

- Add a generated or hand-authored API client from backend schemas.
- Add Zod validators for API responses until generated schemas exist.
- Configure TanStack Query providers.
- Add request correlation IDs and structured error parsing.

Completion check:

- Health, networks, resources, payments, and conformance client calls are typed.

## Phase 5: Local Fixtures

Parts:

- Add testnet resource fixtures.
- Add payment requirement fixtures.
- Add settlement receipt fixtures.
- Add conformance run fixtures.

Completion check:

- UI pages can be developed before the backend is live.

## Phase 6: Home Dashboard Metrics

Parts:

- Show indexed resource count.
- Show active seller count.
- Show settled payment count.
- Show settlement volume by network.
- Show supported networks, API uptime, and latest conformance result.

Completion check:

- Dashboard renders real data when available and fixture data in local demo mode.

## Phase 7: Explore Page Base

Parts:

- Build `/explore`.
- Add search input.
- Add results region.
- Add sort selector.
- Add pagination or cursor handling.

Completion check:

- Users can submit a search and see resource results.

## Phase 8: Resource Filters

Parts:

- Add network filter.
- Add asset filter.
- Add resource type filter.
- Add seller verification filter.
- Add price range filter.
- Add extension filter for Bazaar and MCP metadata.

Completion check:

- Filter state is reflected in the URL and backend query parameters.

## Phase 9: Resource Cards

Parts:

- Build `ResourceCard`.
- Show name, seller domain, type, network, asset, amount, and verification status.
- Show metadata quality and recent settlement status where available.
- Handle partial search results.

Completion check:

- Resource cards are scan-friendly on desktop and mobile.

## Phase 10: Resource Detail Summary

Parts:

- Build `/resources/[resourceId]`.
- Show resource name, description, seller domain, endpoint URL, and route template.
- Show network, `payTo`, asset, amount, and current status.
- Show public settlement history when available.

Completion check:

- A buyer can inspect the full payment terms before calling a resource.

## Phase 11: Schema Viewer

Parts:

- Build `ResourceSchemaViewer`.
- Render input schema.
- Render output schema.
- Add schema validation status.
- Add copy buttons for JSON examples.

Completion check:

- Schema displays are deterministic and readable for HTTP APIs and MCP tools.

## Phase 12: Payment Requirements Viewer

Parts:

- Build `PaymentRequirementViewer`.
- Show x402 scheme, network, asset, amount, recipient, expiry, and extensions.
- Show machine-readable failure reasons.
- Add copyable JSON payload view.

Completion check:

- Developers can inspect the exact 402 terms without reading raw network logs.

## Phase 13: Wallet Connection

Parts:

- Integrate Stellar Wallets Kit.
- Add Freighter support.
- Add wallet status component.
- Add network mismatch handling.
- Add disconnect behavior.

Completion check:

- Testnet wallet connection works without storing private keys.

## Phase 14: Seller Dashboard Base

Parts:

- Build `/seller`.
- Show seller identity status.
- Show domain verification status.
- Show resource count.
- Show recent payment attempts.

Completion check:

- A seller can see whether they are ready to publish paid resources.

## Phase 15: Seller Domain Verification

Parts:

- Build `SellerDomainVerifier`.
- Request backend verification challenge.
- Show DNS or well-known file instructions returned by the backend.
- Submit verification request.
- Display success and stable failure codes.

Completion check:

- Domain verification flow can be completed against backend test fixtures.

## Phase 16: New Resource Wizard Start

Parts:

- Build `/seller/new-resource`.
- Add resource name, description, type, endpoint URL, and route template steps.
- Validate route template syntax.
- Store draft state locally until submission.

Completion check:

- A seller can create a valid resource draft without payment settings.

## Phase 17: Resource Pricing Step

Parts:

- Add network selector.
- Add accepted asset selector.
- Add amount input.
- Add `payTo` address input.
- Add Stellar address validation.

Completion check:

- Invalid asset, amount, network, and recipient values are rejected before submission.

## Phase 18: Metadata Builder Step

Parts:

- Build `MetadataBuilder`.
- Add input schema editor.
- Add output schema editor.
- Add MCP metadata section for tool resources.
- Add preview of Bazaar metadata.

Completion check:

- Seller can generate metadata that matches backend validation expectations.

## Phase 19: Middleware Snippet Generator

Parts:

- Generate Express middleware snippet.
- Generate Fastify middleware snippet.
- Generate Next.js route helper snippet.
- Insert selected resource metadata into snippets.

Completion check:

- Snippets use `@lumenbazaar/seller-sdk` package names and testnet defaults.

## Phase 20: Resource Validation And Publish

Parts:

- Call `/v1/discovery/validate`.
- Show validation warnings and blocking errors.
- Submit resource to `/v1/resources`.
- Trigger cataloging when valid.

Completion check:

- Invalid metadata cannot be published from the UI.

## Phase 21: Seller Resource List ✓

Parts:

- Build `/seller/resources`. ✓
- Add table of seller resources. ✓
- Add status, network, asset, amount, and last indexed time. ✓
- Add edit, disable, and detail links. ✓

Completion check:

- Seller can manage published and draft resources. ✓

## Phase 22: Seller Payments ✓

Parts:

- Build `/seller/payments`. ✓
- Show payment attempts for the seller. ✓
- Show verification status, settlement status, amount, asset, and failure reason. ✓
- Link settled payments to receipts and transaction hashes. ✓

Completion check:

- Seller can reconcile recent payment activity. ✓

## Phase 23: Payment Playground Selection ✓

Parts:

- Build `/playground`. ✓
- Let user select a resource. ✓
- Generate a sample request from the input schema. ✓
- Trigger or simulate initial 402 response. ✓

Completion check:

- Developer can see the payment requirement generated for a chosen resource. ✓

## Phase 24: Payment Playground Verify ✓

Parts:

- Add authorization simulation path. ✓
- Add wallet-backed authorization path where backend support exists. ✓
- Submit payment payload to `/v1/verify`. ✓
- Show accepted and rejected verification states. ✓

Completion check:

- Testnet verification results are visible and machine-readable. ✓

## Phase 25: Payment Playground Settle ✓

Parts:

- Retry paid request after verification. ✓
- Submit settlement through the backend. ✓
- Show receipt ID, transaction hash, ledger, amount, asset, and seller. ✓
- Show failure codes for settlement failures. ✓

Completion check:

- A full testnet payment simulation can be run from the UI. ✓

## Phase 26: Transaction Dashboard (done)

Parts:

- Build `/transactions`. (done)
- Add filters for network, status, asset, seller, and date. (done)
- Show payment attempts and settlements. (done)
- Link transaction hashes to the configured Stellar explorer. (done)

Completion check:

- Operators and reviewers can inspect successful and failed payments. (done)

## Phase 27: Operator Dashboard (done)

Parts:

- Build `/operators`. (done)
- Show API status, supported networks, and configured assets. (done)
- Show queue depth and settlement latency. (done)
- Show RPC and Horizon health. (done)

Completion check:

- Operator can quickly identify degraded backend dependencies. (done)

## Phase 28: Operator Health Page (done)

Parts:

- Build `/operators/health`. (done)
- Render `OperatorHealthTable`. (done)
- Add service-level status rows for API, worker, search, Redis, Postgres, RPC, and Horizon. (done)
- Show last check time and recent failure reason. (done)

Completion check:

- Health checks are readable without exposing secrets. (done)

## Phase 29: Conformance Page (done)

Parts:

- Build `/operators/conformance`. (done)
- Show latest conformance run. (done)
- Show `/supported`, `/verify`, and `/settle` pass or fail status. (done)
- Show exact scheme and future `upto` scheme coverage. (done)

Completion check:

- Reviewers can see conformance status without reading CI logs. (done)

## Phase 30: MCP Tool Inspector (done)

Parts:

- Build `McpToolInspector`. (done)
- Show MCP server metadata. (done)
- Render tool schemas for `search_paid_resources`, `inspect_resource`, and `call_paid_resource`. (done)
- Show budget controls and deterministic error examples. (done)

Completion check:

- Agent developers can inspect MCP tool contracts from the UI. (done)

## Phase 31: Settings (done)

Parts:

- Build `/settings`. (done)
- Add network selection. (done)
- Add facilitator URL override for local development. (done)
- Add wallet preferences. (done)
- Add local demo mode toggle. (done)

Completion check:

- Developers can switch between local, testnet, staging, and mainnet-compatible settings. (done)

## Phase 32: Documentation Links (done)

Parts:

- Build `/docs`. (done)
- Link to seller, buyer, agent, operator, API, contract, and security docs. (done)
- Link each page to the canonical docs repo path. (done)

Completion check:

- Frontend routes never become the canonical documentation source. (done)

## Phase 33: Error And State Hardening (done)

Parts:

- Normalize API errors into stable UI states. (done)
- Add empty states for no resources, no payments, and unavailable conformance runs. (done)
- Add retry actions where safe. (done)
- Avoid logging payment payloads or sensitive wallet data. (done)

Completion check:

- Failure states are clear to humans and still preserve machine-readable codes. (done)

## Phase 34: Accessibility And Responsiveness (done)

Parts:

- Add keyboard navigation checks. (done)
- Add labels for form controls. (done)
- Add responsive tests for mobile and desktop. (done)
- Fix overflow and truncation for addresses, hashes, and schema content. (done)

Completion check:

- Primary seller, buyer, operator, and playground flows work on mobile and desktop. (done)

## Phase 35: Frontend Tests (done)

Parts:

- Add component unit tests. (done)
- Add form validation tests. (done)
- Add API client tests. (done)
- Add wallet mock tests. (done)
- Add Playwright flows for explore, resource detail, seller onboarding, playground, and transactions. (done)

Completion check:

- CI runs lint, typecheck, unit tests, and Playwright smoke tests. (done)

## Phase 36: Testnet Release (done)

Parts:

- Configure deployed frontend environment. (done)
- Connect to testnet backend. (done)
- Verify resource search, seller onboarding, playground, transactions, operator health, and conformance pages. (done)
- Document known limitations. (done)

Completion check:

- Testnet UI is usable by sellers, buyers, agents, operators, and reviewers. (done)

## Phase 37: Mainnet Readiness

Parts:

- Enable mainnet only after backend mainnet acceptance criteria are met.
- Add explicit mainnet labels and warnings.
- Verify production asset configuration.
- Confirm the UI still exposes settlement details.

Completion check:

- Mainnet UI does not hide network, asset, amount, recipient, or transaction details.

## Phase 38: Maintenance

Parts:

- Add changelog process.
- Track frontend issues from Drips.
- Keep API schemas synchronized.
- Add regression tests for each fixed UI bug.

Completion check:

- The frontend can evolve without drifting from backend, docs, and contract behavior.


## Phase 39: Receipt Evidence Verification (Completed)

### Overview

Receipt evidence verification ensures that a settlement receipt presented to the user matches the original payment terms they approved. This prevents scenarios where a malicious or faulty backend could swap payment details mid-transaction.

### Key Principles

1. **Non-Sensitive Storage**: Persist only the approved payment terms (identifiers, amounts, networks) in sessionStorage—never store signatures, private keys, or complete signed payloads.
2. **Field-by-Field Validation**: Compare each critical payment term independently against the receipt.
3. **Explicit Indeterminate State**: Any mismatch immediately triggers an explicit "indeterminate" security state—confirmation is impossible if evidence disagrees.
4. **User Visibility**: Display validation errors prominently as security warnings so users can investigate mismatches.

### Payment Terms Persisted

The system persists all seven critical payment terms in the recovery record:

| Term | Stored In | Compared At | Purpose |
|------|-----------|------------|---------|
| **Network** | `recovery.network` | Receipt validation | Ensures payment on correct blockchain |
| **Asset Code** | `recovery.assetCode` | Receipt validation | Ensures correct token is paid |
| **Asset Issuer** | `recovery.assetIssuer` | Receipt validation | Identifies token issuer address |
| **Amount** | `recovery.amount` | Receipt validation | Confirms correct payment amount |
| **Recipient** (payTo) | `recovery.payTo` | Recovery record | Ensures funds go to intended seller |
| **Payment Attempt ID** | `recovery.paymentAttemptId` | Settlement & receipt validation | Tracks payment through backend |
| **Correlation ID** | `recovery.correlationId` | Settlement & receipt validation | Correlates verify → settle → receipt flow |

### Implementation Details

#### Recovery Record Schema

```typescript
const recoverySchema = z.object({
  amount: z.string().regex(/^[1-9]\d*$/),           // Atomic amount (stroops)
  assetCode: z.string().min(1),                      // Asset code (e.g., "USDC")
  assetIssuer: z.string().min(1),                    // Asset issuer address or contract ID
  correlationId: z.string().min(1),                  // Verification → settlement correlation
  network: z.literal("stellar:testnet"),             // Network identifier
  paymentAttemptId: z.string().min(1),               // Unique payment identifier
  payTo: z.string().min(1),                          // Intended recipient address
  receiptId: z.string().min(1).optional(),           // Set after settlement submission
  resourceId: z.string().min(1),                     // Resource being paid for
  stage: z.enum(["verified", "submitted"]),         // Payment stage
  transactionHash: z.string().min(1).optional(),     // Set after successful settlement
  updatedAt: z.string().datetime()                   // Last update timestamp
});
```

Recovery records are stored in `sessionStorage` under keys like `lumenbazaar:payment-recovery:${resourceId}`. The storage is cleared:
- After successful settlement confirmation
- On explicit settlement failures
- On browser close (session scope)

#### Validation Function

`validateReceiptEvidence(receipt, recovery)` performs field-by-field comparison:

```
Receipt Identifier Validation:
├─ receipt.id matches recovery.receiptId
├─ receipt.paymentAttemptId matches recovery.paymentAttemptId
└─ receipt.correlationId matches recovery.correlationId

Network Validation:
└─ receipt.network matches recovery.network

Payment Terms Validation:
├─ receipt.amount matches recovery.amount
├─ receipt.assetCode matches recovery.assetCode
└─ receipt.assetIssuer matches recovery.assetIssuer

Recipient Validation:
└─ receipt.sellerId is present and represents intended recipient

Resource Validation:
└─ receipt.resourceId matches recovery.resourceId (if present)

Transaction Lineage Validation:
└─ receipt.transactionHash matches recovery.transactionHash (if present)
```

Each mismatch generates an explicit error message:
- "Amount mismatch: expected 500000, got 600000"
- "Asset code mismatch: expected USDC, got USDT"
- "Network mismatch: expected stellar:testnet, got stellar:public"

#### Outcome State Management

When `outcomeFromReceipt()` is called:

1. **Validation Phase**: Run `validateReceiptEvidence()` first
   - If errors detected: return `{ state: "indeterminate", validationErrors: [...] }`
   - Prevents confirmation state if any evidence disagrees

2. **Status Phase**: Check receipt status only after validation passes
   - `status === "failed"` → `{ state: "rejected" }`
   - `status === "pending"` → `{ state: "pending" }`
   - `status === "finalized"` + ledger → `{ state: "confirmed" }`

### UI/UX Updates

#### PaymentOutcome Component

When `outcome.validationErrors` is present, an amber warning alert displays:

```tsx
{hasValidationErrors && (
  <div role="alert" className="bg-amber-50 border-amber-200">
    <h3>Receipt evidence validation warnings</h3>
    <ul>
      {outcome.validationErrors.map(error => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  </div>
)}
```

Enhanced receipt details display:
- **Receipt ID**: Full ID with text wrapping
- **Receipt Status**: pending | finalized | failed
- **Ledger**: Ledger number or "Pending"
- **Amount**: Payment amount
- **Asset**: Asset code
- **Network**: Network identifier

### Test Coverage

Comprehensive test suite in `paid-flow.test.ts` with 8 focused tests:

1. ✅ Amount mismatch → indeterminate
2. ✅ Asset code mismatch → indeterminate
3. ✅ Asset issuer mismatch → indeterminate
4. ✅ Network mismatch → indeterminate
5. ✅ Resource ID mismatch → indeterminate
6. ✅ Payment attempt ID mismatch → indeterminate
7. ✅ Correlation ID mismatch → indeterminate
8. ✅ Transaction hash mismatch → indeterminate

Each test:
- Mutates a single field independently
- Verifies indeterminate state is returned
- Confirms detailed error message is present
- Uses helper functions for consistent setup

### Security Constraints

1. **No Signature Storage**: Authorization payloads are never persisted
2. **No Private Key Storage**: Wallet operations are delegated to Freighter
3. **No Complete Payloads**: Recovery stores only identifiers and terms
4. **Testnet Only**: Currently limited to `stellar:testnet`
5. **Fail Closed**: Any validation error blocks confirmation

### Error Messages for Debugging

Error messages are specific but don't expose backend internals:

✅ **User-Facing**:
- "Amount mismatch: expected 500000, got 600000"
- "Network mismatch: expected stellar:testnet, got stellar:public"

❌ **Avoid Exposing**:
- Full request/response bodies
- API endpoint URLs
- Backend version or service names
- Stack traces or SQL queries

### Browser Compatibility

Recovery records use `sessionStorage` (supported in all modern browsers):
- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: Chrome, Safari (iOS 5+)
- Falls back gracefully to `null` in SSR contexts

### Known Limitations

1. Asset code derivation requires optional `resourceAssetCode`/`resourceAssetIssuer` parameters in `ExecutePaidFlowInput`—default to generic values if not provided
2. `payTo` comparison is implicit (checked only for `sellerId` presence in receipt)
3. Only one unresolved payment attempt per resource (sessionStorage key scoped to resourceId)
4. No recovery across browser sessions (sessionStorage cleared on close)

### Future Enhancements

1. **Cross-Session Recovery**: Persist recovery metadata with encryption (localStorage + vault)
2. **Mainnet Support**: Extend network validation beyond testnet
3. **Signature Verification**: Include challenge fingerprint validation for replay detection
4. **Audit Logging**: Store anonymized validation events for fraud detection
5. **Batch Validation**: Handle multiple concurrent payment attempts

