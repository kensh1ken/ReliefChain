# ReliefChain Backend Contract Baseline

Status: Phase 0 baseline for review. This document describes the current backend contract and the decisions that must remain stable during refactoring.

## API

- Base path: `/api/v1`
- Authentication: staff login and beneficiary OTP verification return a bearer JWT.
- Error response: current endpoints may return NestJS error responses. The target error shape is `code`, `message`, `correlationId`, and optional field-level `details`.
- Money: integer Indian paise only. No floating point. JSON fields use the `*Paise` suffix.
- Public references: opaque values in the form `RC-YYYY-XXXXXXXX`.
- Pagination and advanced filters are not implemented in the current MVP; additions must be backward-compatible.

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
| Disbursement | `PENDING`, `SETTLED`, `FAILED`, `REVERSED` | `PENDING -> SETTLED`, `PENDING -> FAILED`, `SETTLED -> REVERSED` |

Invalid transitions, duplicate idempotency keys, non-positive amounts, over-allocation, over-disbursement, and ineligible beneficiaries must be rejected.

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
  "payload": {}
}
```

Current event names include `DisasterRegistered`, `SchemeRegistered`, `FundSourceCreated`, `FundsAllocated`, `BeneficiaryCommitted`, `DisbursementInitiated`, `DisbursementSettled`, `DisbursementFailed`, and `DisbursementReversed`.

## Environment Contract

Required by the current API: `DATABASE_URL`, `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `BENEFICIARY_HMAC_SECRET`, and `MOCK_OTP`.

Optional/runtime settings include `PORT`, `WEB_ORIGIN`, `AUTO_SEED`, `DEMO_BENEFICIARY_PHONE`, `MOCK_PAYOUT_DELAY_MS`, `LEDGER_MODE`, and Fabric connection variables. Mock OTP and simulated payout outcomes are local/demo-only capabilities.

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