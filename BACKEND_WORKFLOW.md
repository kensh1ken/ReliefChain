# ReliefChain Backend Workflow

This document describes the backend workflow that is currently implemented. It must be updated whenever a backend feature, route, state transition, database table, ledger interaction, background job, privacy rule, or operational dependency changes.

## Runtime Entry Point

1. `apps/api/src/main.ts` loads environment variables and validates required configuration.
2. NestJS creates `AppModule` and registers the shared core, authentication, domain, public, operator, beneficiary, audit, and health modules.
3. The API uses the `/api/v1` global prefix, CORS from `WEB_ORIGIN`, global validation with transformation and whitelisting, and Swagger at `/api/v1/docs`.
4. `DatabaseService` opens a PostgreSQL pool and runs pending versioned migrations from `apps/api/src/migrations/` during module initialization.
5. `PayoutWorker` starts an immediate poll and then polls every second while the process is running.
6. If `AUTO_SEED=true`, `SeedService` creates synthetic demo users and Assam relief records after the API starts.

## Request Pipeline

```text
Client
  -> NestJS route under /api/v1
  -> JWT guard and role metadata for protected routes
  -> Controller validation and request mapping
  -> Domain/application service
  -> PostgreSQL query or transaction
  -> LedgerPort submission/evaluation when required
  -> PostgreSQL projection/proof response
```

Controllers should handle HTTP transport concerns only. Domain services own business validation, ownership, district scope, eligibility, balances, state transitions, privacy transformations, and calls through `LedgerPort`.

## Route Workflow

### Unauthenticated routes

| Route | Current behavior |
|---|---|
| `POST /auth/login` | Looks up a staff user by case-insensitive email, verifies the Argon2 password, creates a hashed refresh session, and returns a short-lived access JWT plus refresh token with role, organization, and optional district claims. |
| `POST /auth/otp/request` | Normalizes and hashes the phone, returns an accepted response for unknown phones, rate-checks known beneficiaries for 30 seconds, stores an Argon2 hash of `MOCK_OTP` with a five-minute expiry, and returns a masked phone. |
| `POST /auth/otp/verify` | Finds the newest unconsumed, unexpired challenge, allows at most five attempts, verifies the OTP, consumes the challenge, and returns a short-lived beneficiary JWT plus refresh token. |
| `POST /auth/refresh` | Hashes the supplied refresh token, locks the active session, rejects expired/revoked tokens, creates a replacement session/token pair, and revokes the old session. |
| `POST /auth/logout` | Requires a valid JWT, records its `jti` in `token_revocations`, and revokes the matching refresh session. |
| `GET /public/summary` | Reads aggregate totals and indexer checkpoint metadata from PostgreSQL and calculates remaining funds. |
| `GET /public/districts` | Reads district/scheme/source aggregates and suppresses groups with fewer than three distinct beneficiaries. |
| `GET /public/proof/:reference` | Looks up a public disbursement reference and returns proof/status fields; unknown references return `{ "found": false }`. |
| `GET /health` | Executes `SELECT 1` and returns API status, configured ledger mode, and a timestamp. |

### Protected routes

| Role | Routes | Boundary |
|---|---|---|
| `GOVERNMENT`, `NGO` | `GET /operator/context` | Sources, allocations, and disbursements are filtered by the JWT organization. |
| `GOVERNMENT`, `NGO` | `POST /operator/fund-sources` | Validates the shared fund schema; NGO users may create only NGO sources; submits `CreateFundSource`, then inserts the PostgreSQL projection. |
| `GOVERNMENT`, `NGO` | `POST /operator/allocations` | Validates the allocation schema; locks and checks the owned source balance; submits `AllocateFunds`, then updates and inserts PostgreSQL records. |
| `GOVERNMENT`, `NGO` | `POST /operator/beneficiaries` | Validates synthetic identity/contact data; checks district scope; creates an HMAC reference; submits `RegisterBeneficiaryCommitment`; stores only encrypted contact data and a phone hash. |
| `GOVERNMENT`, `NGO` | `POST /operator/disbursements` | Validates idempotency, ownership, beneficiary district/scheme eligibility, and allocation balance; submits `InitiateDisbursement`; reserves funds; inserts a pending disbursement and payout job. |
| `GOVERNMENT`, `NGO` | `POST /operator/disbursements/:id/reverse` | Locks an owned payout, permits only `SETTLED` payouts, submits `ReverseDisbursement`, then changes the payout to `REVERSED` and reduces disbursed balance. |
| `BENEFICIARY` | `GET /beneficiary/me` | Uses the beneficiary ID in the JWT and returns decrypted own name plus scheme, promised amount, and payment history. |
| `AUDITOR` | `GET /audit/events` | Reads ledger event projections, optionally filtered by entity type and capped at 500 rows. |
| `AUDITOR` | `GET /audit/reconciliation` | Aggregates each fund source's allocated, disbursed, pending, and remaining amounts. |
| `AUDITOR` | `GET /audit/export.csv` | Exports disbursement references, public financial fields, statuses, timestamps, and ledger transaction IDs as CSV. |

## Financial State Flow

```text
Fund source created
  -> allocation created
  -> beneficiary commitment registered
  -> disbursement PENDING and allocation amount RESERVED
  -> SETTLED: reservation removed, disbursed amount increased
  -> FAILED: reservation removed, disbursed amount unchanged
  -> REVERSED: settled disbursed amount reduced
```

The current accepted disbursement transitions are `PENDING -> SETTLED`, `PENDING -> FAILED`, and `SETTLED -> REVERSED`. Amounts are positive integer paise values. Duplicate disbursement idempotency keys return the existing database row instead of creating another application payout.

## Payout Worker Workflow

1. The worker selects up to five incomplete jobs whose `run_after` has passed and whose `attempts` count is below five.
2. For each job, it loads the associated pending disbursement and owner.
3. It generates a simulated bank reference and chooses the configured `SETTLED` or `FAILED` outcome.
4. It submits `FinalizeDisbursement` through `LedgerPort`.
5. It updates allocation reservation/disbursement totals, payout status/proof, and job completion in a PostgreSQL transaction.
6. On error, it increments attempts, stores `last_error`, and retries after a fixed ten-second delay.

The worker currently has only an in-process overlap flag. It has no atomic row leasing, exponential backoff, dead-letter state, durable attempt history, or `UNKNOWN` provider state.

## Database and Migration Workflow

- Migrations are versioned TypeScript definitions under `apps/api/src/migrations/`.
- `runMigrations` creates `schema_migrations`, obtains a PostgreSQL transaction advisory lock, applies each unapplied migration in order, records its ID, and rolls back on failure.
- `001_initial` is the baseline equivalent of the former `schema.ts` startup schema.
- `002_integrity_indexes` adds positive payout/job checks and indexes for ownership, due jobs, idempotency, ledger entities, and common lookups.
- `003_operational_persistence` adds sessions/revocations, payout batches/attempts/dead letters, audit annotations/actions, and outbox events.
- `004_session_subjects` allows refresh sessions to belong to either a staff user or beneficiary.
- `DatabaseService` runs migrations during application initialization; it no longer executes `schemaSql` directly.
- `npm run migrate -w @reliefchain/api` runs migrations as an explicit deployment/operations command.
- `schema.ts` remains in the repository as a legacy reference but is no longer part of startup persistence behavior.
- `LedgerRepository` provides bounded event queries with a maximum page size of 500 and optional cursor pagination.
- `ProjectionRepository` provides transactional ledger-event/checkpoint reset and checkpoint lookup for future replay tooling.
- The default `GET /audit/events` response remains an array; providing `before` returns `{ items, nextBeforeSequence }`.

### Operational Persistence

- `staff_sessions` and `token_revocations` are migration-ready; current authentication routes do not yet use refresh sessions.
- Batch, attempt, dead-letter, annotation, outbox, and API-action tables are migration-ready; their feature workflows are not yet exposed by routes.
- `RetentionService.purgeExpired()` explicitly removes expired OTP challenges, old sessions, expired token revocations, and published outbox events.
- Retention defaults are defined in `retention.ts` and can be overridden with `RETENTION_*_DAYS` environment variables.
- Encrypted contacts, external logs, and exports have no automatic deletion policy yet. Cleanup is not scheduled automatically by the API process.
- Authentication limits are configurable through `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_DAYS`, `LOGIN_RATE_LIMIT`, `OTP_REQUEST_RATE_LIMIT`, `OTP_VERIFY_RATE_LIMIT`, `PROOF_RATE_LIMIT`, `AUDIT_FILTER_RATE_LIMIT`, and `AUDIT_EXPORT_RATE_LIMIT`.
- Rate limiting uses atomic PostgreSQL buckets in `rate_limit_buckets`, so API instances share limits. Keys are SHA-256 hashed before storage.

## Ledger Workflow

- All domain ledger operations use the `LedgerPort` interface, bound to `LedgerService` by `DomainModule`.
- With `LEDGER_MODE=fabric`, the service loads the organization-specific gateway credentials, submits the transaction, waits for commit status, and records a receipt/event.
- In other modes, it generates a development transaction ID and records a simulated receipt/event.
- Ledger events are written to `ledger_events`; the checkpoint is updated using the receipt block number when available.
- Public and audit reads currently use PostgreSQL projections.

## Privacy Boundary

Raw synthetic Aadhaar-like values are used only to derive the HMAC beneficiary reference. Names and phones are encrypted with AES-256-GCM; phone lookup uses a SHA-256 hash. Raw Aadhaar-like values, names, phones, OTPs, bank data, secrets, encryption keys, and private commitments must not be returned by public/audit routes or placed in ledger payloads and logs.

## Current Caveats

- Ledger submission happens before related PostgreSQL writes commit. A database rollback cannot undo a committed ledger transaction.
- If finalization commits to the ledger but its PostgreSQL update fails, the worker can retry while the payout remains `PENDING`, potentially submitting another finalization.
- Multiple worker processes can select the same job because there is no database lease.
- Failed jobs stop being selected after five attempts but are not placed in a dead-letter state.
- `controllers.ts`, `auth.ts`, and `ReliefService` remain compatibility files; registered modules use the extracted controllers, auth components, and domain services.
- PostgreSQL projections are currently receipt/application writes, not a durable peer block-event replay indexer.
- Mock OTP is provided through `OtpProvider` and is rejected in production; a real notification provider is not implemented yet.
- `IdentityService` supports configured current/previous encryption and HMAC key rings; new encrypted values carry a version prefix and older values can be read with configured previous keys.
- `redactSensitive` removes known sensitive fields from nested projection payloads; full structured log/trace integration is not implemented yet.
- Refresh-token values are not stored directly; only SHA-256 hashes are stored in PostgreSQL. Access-token revocation is checked against `token_revocations`.

## Required Update Checklist

Every backend feature change must update this file in the same change set:

- [ ] Add or update the route and request/response behavior.
- [ ] Add or update authentication, role, organization, and district boundaries.
- [ ] Add or update the responsible controller, module, service, port, and repository files.
- [ ] Add or update database tables, columns, constraints, indexes, and migrations.
- [ ] Add or update ledger transactions, event payloads, proofs, and state transitions.
- [ ] Add or update worker/job behavior, retry, timeout, and recovery rules.
- [ ] Check public, beneficiary, auditor, logs, and export privacy exposure.
- [ ] Add or update unit, integration, contract, security, and resilience tests.
- [ ] Update health, metrics, configuration, deployment, and operational behavior.
- [ ] Update `BACKEND_CONTRACTS.md`, `openapi.json`, and `plan.md` when their contracts or completion status change.