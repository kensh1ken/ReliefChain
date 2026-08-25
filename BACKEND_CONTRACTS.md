# ReliefChain Backend Contract Baseline

Status: Frozen ledger contract v1 and hackathon MVP backend baseline. Breaking ledger changes require schema v2 and a new ADR.

## API

- Base path: `/api/v1`
- Authentication: staff login and beneficiary OTP verification return a short-lived bearer JWT and rotating refresh token. `POST /auth/refresh` rotates refresh sessions; `POST /auth/logout` revokes the current access token/session.
- Error response: current endpoints may return NestJS error responses. The target error shape is `code`, `message`, `correlationId`, and optional field-level `details`.
- Money: integer Indian paise only. No floating point. JSON fields use the `*Paise` suffix. Fabric transaction arguments encode paise as canonical positive decimal strings with a maximum of `1000000000000`; signs, leading zeroes, decimals, and exponent notation are invalid.
- Public references: opaque values in the form `RC-YYYY-XXXXXXXX`.
- Default access-token lifetime: 900 seconds; default refresh-session lifetime: 30 days. Access tokens are bounded to 60-3600 seconds and refresh sessions to 1-90 days.
- Pagination and advanced filters are not implemented across the current MVP; `GET /audit/events` accepts an optional `before` cursor while retaining its array response when the cursor is omitted. Additions must be backward-compatible.

## Domain Vocabulary

| Term | Meaning |
|---|---|
| Disaster | A relief event, such as Assam Flood Response 2026. |
| Scheme | A relief program belonging to a disaster. |
| Fund source | Money received by a government or NGO owner. |
| Allocation | A portion of a fund source assigned to a district and scheme. |
| Beneficiary commitment | An off-chain beneficiary record paired with an HMAC reference on the ledger. |
| Disbursement | A payout request for an eligible beneficiary. |
| Settlement | A pending disbursement finalized successfully. |
| Reversal | A compensating transition from a settled disbursement to reversed. |

## States and Transitions

| Entity | States | Allowed transitions |
|---|---|---|
| Disbursement | `PENDING`, `SETTLED`, `FAILED`, `UNKNOWN`, `REVERSED` | `PENDING -> SETTLED`, `PENDING -> FAILED`, `PENDING -> UNKNOWN`, `UNKNOWN -> SETTLED`, `UNKNOWN -> FAILED`, `SETTLED -> REVERSED` |

Invalid transitions, duplicate idempotency keys with different data, non-positive amounts, over-allocation, over-disbursement, and ineligible beneficiaries must be rejected. `UNKNOWN` retains its allocation reservation until provider reconciliation.

## Authorization Matrix

| Role | Read | Write |
|---|---|---|
| Public | Aggregate dashboard, district aggregates, proof by public reference | None |
| `GOVERNMENT` | Government operator context | Government-owned sources and allocations; eligible beneficiary/disbursement workflows |
| `NGO` | NGO operator context | NGO-owned sources and allocations; eligible beneficiary/disbursement workflows |
| `AUDITOR` | Events, reconciliation, exports | None of the financial workflows |
| `BENEFICIARY` | Own beneficiary record and payment history | None |

Organization scope is mandatory: `GovernmentMSP` must not operate NGO-owned records, and `NgoMSP` must not operate government-owned records. An operator with a district restriction may operate only in that district.

## Privacy Contract

The raw synthetic Aadhaar-like value, phone, name, OTP, bank data, encryption keys, JWT secrets, and private beneficiary commitment must never appear in Fabric payloads, public responses, logs, traces, metrics, exports, or source control.

- Beneficiary reference: HMAC-SHA-256 of the normalized 12-digit synthetic identifier.
- Stored contact data: AES-256-GCM encrypted with the configured 32-byte key.
- Phone lookup: SHA-256 hash of the normalized phone.
- Public data: aggregates and privacy-safe proof fields only.

## Persistence Baseline

- Migrations are applied in order under a PostgreSQL advisory transaction lock.
- The current migration set includes operational tables for sessions, token revocation, payout batches/attempts, dead letters, audit annotations/actions, and outbox events.
- Retention defaults are configurable through `RETENTION_*_DAYS`; encrypted contacts, external logs, and exports have no automatic deletion policy yet.
- Key-version metadata uses `PII_ENCRYPTION_KEY_VERSION` and `BENEFICIARY_HMAC_KEY_VERSION`; defaults are `1` until rotation is implemented.
- Mock OTP delivery is available only outside production through the `OtpProvider` port. Rate limits are PostgreSQL-shared and configurable per endpoint.

## Disbursement Orchestration

- Idempotency reservations are stored in `disbursement_requests` before ledger submission.
- Provider attempts store attempt number, status, provider reference, and error details in `payout_attempts`.
- Batches use `DRAFT -> PENDING_APPROVAL -> APPROVED -> SUBMITTED` with creator/approver separation.
- Non-ledger application changes are published to `outbox_events`.
- Provider references for `UNKNOWN` payouts can be reconciled through the owner-scoped operator endpoint; successful reconciliation releases the reservation and records a terminal transition.
- Payout jobs use atomic leasing with PostgreSQL advisory locks to support multiple concurrent workers.
- Job states include `QUEUED`, `LEASED`, `DEAD_LETTERED`, and `COMPLETED` with automatic lease expiry handling.
- Retry delays follow exponential backoff: `base * 2^(attempt-1)` capped at a configurable maximum.
- Jobs exceeding the maximum attempt limit are moved to dead-letter state for manual review and resolution.
- All job state changes are transactionally consistent with disbursement status, allocation balances, and attempt history.

## Ledger Event Envelope

Every accepted ledger transition must use a versioned, privacy-safe event envelope:

```json
{
  "schemaVersion": 1,
  "eventType": "DisbursementInitiated",
  "entityType": "disbursement",
  "entityId": "opaque-or-uuid",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "transactionId": "ledger-transaction-id",
  "actorMsp": "GovernmentMSP",
  "payload": {}
}
```

Current event names include `DisasterRegistered`, `SchemeRegistered`, `FundSourceCreated`, `FundsAllocated`, `BeneficiaryCommitted`, `DisbursementInitiated`, `DisbursementSettled`, `DisbursementFailed`, and `DisbursementReversed`.

`occurredAt` comes from the Fabric transaction timestamp, `transactionId` comes from the transaction context, and `actorMsp` comes from the submitting certificate. `schemaVersion` is exactly `1`; consumers must reject or quarantine unsupported versions rather than guessing their shape.

### Frozen ledger transactions v1

Arguments are positional strings because that is the Fabric wire format. Transaction names and existing argument positions remain stable.

| Transaction | Arguments in order | Privacy-safe return view |
|---|---|---|
| `RegisterDisaster` | `id`, `name`, `stateCode` | Disaster identifier, state code, transaction timestamp |
| `RegisterScheme` | `id`, `disasterId`, `name` | Scheme and disaster identifiers, transaction timestamp |
| `CreateFundSource` | `id`, `disasterId`, `sourceType`, `name`, `amountPaise` | Source identifiers, owner/type, balance totals, transaction timestamp |
| `AllocateFunds` | `id`, `sourceId`, `schemeId`, `districtCode`, `amountPaise` | Allocation identifiers, owner/district, balance totals, transaction timestamp |
| `RegisterBeneficiaryCommitment` | `beneficiaryRef`, `districtCode`, `schemeId` | Transaction-derived commitment ID, district/scheme, transaction timestamp |
| `InitiateDisbursement` | `id`, `publicReference`, `allocationId`, `beneficiaryRef`, `amountPaise`, `idempotencyKey` | Public disbursement fields with no beneficiary or idempotency value |
| `FinalizeDisbursement` | `id`, `status`, `providerReferenceHash`, `reasonCode` | Public disbursement fields plus an optional provider-reference hash/reason code |
| `ReverseDisbursement` | `id`, `reasonCode` | Public disbursement fields and reversal reason code |

The HMAC beneficiary reference may be used as transaction input and stored as the private ledger linkage required by the current model, but it is excluded from transaction return views and events. The provider reference is stored raw only in PostgreSQL; Fabric receives at most `sha256:<64 lowercase hexadecimal characters>`.

`UNKNOWN` is an off-chain orchestration state in ledger contract v1. Fabric keeps the disbursement `PENDING` and retains the reservation until reconciliation finalizes it as `SETTLED` or `FAILED`. Payout batches, payout attempts, and detailed provider errors are off-chain. Reversal v1 changes the original settled disbursement to `REVERSED`; a separate linked reversal asset is deferred to a future schema version.

### Event payload allowlists

| Event | Allowed payload fields |
|---|---|
| `DisasterRegistered` | `stateCode` |
| `SchemeRegistered` | `disasterId` |
| `FundSourceCreated` | `disasterId`, `sourceType`, `amountPaise`, `ownerMsp` |
| `FundsAllocated` | `sourceId`, `schemeId`, `districtCode`, `amountPaise`, `ownerMsp` |
| `BeneficiaryCommitted` | `districtCode`, `schemeId` |
| `DisbursementInitiated` | `publicReference`, `allocationId`, `amountPaise`, `ownerMsp`, `fromStatus`, `toStatus` |
| `DisbursementSettled` | Initiated fields plus optional `providerReferenceHash` |
| `DisbursementFailed` | Initiated fields plus optional `providerReferenceHash` and required `reasonCode` |
| `DisbursementReversed` | Initiated fields plus required `reasonCode` |

Payload schemas are strict. Beneficiary references, idempotency keys, raw provider/bank references, names, phones, Aadhaar-like values, OTPs, raw provider errors, secrets, and internal notes are prohibited recursively. `BeneficiaryCommitted.entityId` is a transaction-derived opaque commitment ID, never the beneficiary reference.

### Stable ledger errors

Fabric error text uses `[CODE] human-readable message`. Callers may depend on the code but not the message.

| Code | Meaning |
|---|---|
| `LEDGER_INVALID_ARGUMENT` | An identifier, enum, or other argument is invalid |
| `LEDGER_INVALID_AMOUNT` | Paise is not a canonical positive in-range decimal string |
| `LEDGER_NOT_FOUND` | A required ledger asset does not exist |
| `LEDGER_DUPLICATE` | An ID or idempotency key already exists |
| `LEDGER_UNAUTHORIZED` | The submitting identity cannot perform writes |
| `LEDGER_OWNERSHIP_MISMATCH` | The submitting organization does not own the asset |
| `LEDGER_INSUFFICIENT_BALANCE` | A source/allocation balance invariant would be violated |
| `LEDGER_INVALID_TRANSITION` | The requested state transition is illegal |
| `LEDGER_PRIVACY_VIOLATION` | A prohibited value was supplied for ledger publication |

### Compatibility rules

- Fixtures in `packages/contracts/fixtures` and schemas exported by `@reliefchain/contracts` are the machine-readable source of truth.
- Changes within v1 are additive. Existing transaction names and positional argument prefixes cannot change.
- Breaking argument, return, event, money, privacy, or state semantics require schema v2 and an ADR.
- Consumers reject unsupported event schema versions and never silently coerce malformed money or payloads.
- The committed receipt shape remains `transactionId`, nullable `blockNumber`, `committedAt`, and `status: VALID`.

## Environment Contract

Required by the current API: `DATABASE_URL`, `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `BENEFICIARY_HMAC_SECRET`, and `MOCK_OTP`.

Optional/runtime settings include `PORT`, `WEB_ORIGIN`, `AUTO_SEED`, `DEMO_BENEFICIARY_PHONE`, `MOCK_PAYOUT_DELAY_MS`, `LEDGER_MODE`, and Fabric connection variables. Mock OTP and simulated payout outcomes are local/demo-only capabilities.

Worker configuration includes `WORKER_MAX_ATTEMPTS` (default: 5), `WORKER_BASE_RETRY_DELAY_MS` (default: 10000), and `WORKER_MAX_RETRY_DELAY_MS` (default: 300000).

## Seed Fixture Contract

- Staff accounts: `gov@reliefchain.demo`, `ngo@reliefchain.demo`, and `auditor@reliefchain.demo`.
- Demo staff password: `Relief@123`.
- Demo disaster: `Assam Flood Response 2026` in state `AS`.
- Demo districts: `AS-KAM` and `AS-BRP`.
- Public proof reference is generated at runtime; tests must use fixture-created references rather than assuming a random value.
- All fixture identities, phones, amounts, and payouts are synthetic.

## Phase 0 Acceptance

- This contract baseline and `openapi.json` are checked into source control.
- Shared validation and ledger invariant tests pass.
- Integration tests must be added before refactoring to prove login, OTP, fund creation, allocation, beneficiary registration, payout finalization, reversal, proof lookup, audit export, and all authorization failures.
