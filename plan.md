# ReliefChain Backend Work Plan

This plan covers backend work only. It is based on `HOW_TO_USE.md`, `ARCHITECTURE.md`, and `UPGRADE_PLAN.md`, plus the current implementation under `apps/api`.

## Scope

Own and improve:

- NestJS API, authentication, authorization, validation, and OpenAPI.
- PostgreSQL schema, migrations, repositories, projections, and retention.
- Funds, allocations, beneficiaries, disbursements, reversals, and public/audit queries.
- Payout orchestration, provider abstraction, retries, reconciliation, and worker recovery.
- Fabric gateway integration from the API and the block-event indexer.
- Backend observability, health checks, security controls, and automated tests.

Do not implement frontend, mobile, Fabric network, or chaincode work in this plan. Coordinate with those teams where shared contracts or ledger behavior are required.

## Current Backend Starting Point

- `apps/api/src/controllers/` contains the registered public, operator, beneficiary, audit, and health controllers; `controllers.ts` is a legacy compatibility source.
- `apps/api/src/auth/` contains the extracted staff login, OTP, JWT verification, roles, and phone hashing components; `auth.ts` is a compatibility barrel.
- `apps/api/src/relief.service.ts` is a compatibility facade over feature domain services.
- `apps/api/src/database.service.ts` executes startup schema SQL and provides transactions.
- `apps/api/src/schema.ts` contains unversioned `CREATE TABLE IF NOT EXISTS` definitions.
- `apps/api/src/worker.ts` polls payout jobs in one process without atomic leasing.
- `apps/api/src/ledger.ts` supports memory/Fabric submission and records API-side receipts.
- `apps/api/src/security.test.ts` contains only a small set of configuration and phone-hashing tests.

## Phase 0: Freeze Existing Behavior and Contracts

- [x] Export and check in the current Swagger/OpenAPI document from `/api/v1/docs`.
- [x] Define the domain glossary: disaster, scheme, source, allocation, commitment, disbursement, settlement, and reversal.
- [x] Document integer paise money handling and `INR`; reject floating-point financial values at the shared validation boundary.
- [x] Document UUID entity IDs, opaque public references, and HMAC beneficiary references.
- [x] Document the current allocation and disbursement state machines and legal transitions.
- [x] Document API request/response shapes, current pagination behavior, idempotency behavior, and the target error format.
- [x] Document the versioned ledger-event envelope, event names, safe payload rules, and fixture expectations.
- [x] Document the role and organization/district authorization matrix.
- [x] Document environment variable names and local, CI, staging, and pilot configuration requirements.
- [x] Record current seed IDs, ledger transaction fixture expectations, status names, and synthetic fixture data.
- [ ] Add integration coverage for login, OTP, fund creation, allocation, beneficiary registration, payout, settlement, failure, reversal, proof lookup, and audit export.
- [ ] Add negative tests for cross-organization access, district restrictions, duplicate payouts, invalid amounts, invalid transitions, and beneficiary ineligibility.

## Phase 1: Refactor the NestJS API Without Changing Behavior

### Controllers and module boundaries

- [x] Split the registered routes into `controllers/public.controller.ts`, `controllers/operator.controller.ts`, `controllers/beneficiary.controller.ts`, `controllers/audit.controller.ts`, and `controllers/health.controller.ts`. The legacy `controllers.ts` remains only as a temporary compatibility source.
- [x] Create narrow NestJS module boundaries and exports for auth, core infrastructure, domain workflows, public queries, operator workflows, beneficiary access, audit, and health.
- [x] Keep the extracted controllers limited to transport concerns: DTO validation, authentication, authorization metadata, and response mapping.
- [x] Preserve `/api/v1` routes and existing request/response behavior while refactoring.
- [x] Extract authentication into `auth/auth.controller.ts`, `auth/auth.service.ts`, `auth/jwt.guard.ts`, `auth/roles.decorator.ts`, and `auth/auth.types.ts`; retain `auth.ts` as a compatibility barrel.

### Domain services

- [x] Split `ReliefService` into funds, beneficiary, disbursement, and payout application services, retaining a compatibility facade for seed and worker callers.
- [x] Keep financial invariants in application/domain services and chaincode; do not move them into controllers or clients.
- [x] Put the ledger external integration behind the `LedgerPort`/`LEDGER_PORT` interface boundary. Repository ports remain part of the persistence phase.
- [x] Ensure the owning organization and district scope are checked at both controller and use-case boundaries.
- [x] Make all ledger calls pass through the `LedgerPort` interface, bound to `LedgerService` by `DomainModule`.

## Phase 2: Database and Persistence

- [x] Replace startup schema execution in `database.service.ts` with a transactional migration runner and versioned migrations.
- [x] Create `001_initial` as a baseline migration matching the current `schema.ts` schema.
- [x] Add migration `003_operational_persistence` for staff sessions, token revocation, payout batches, payout attempts, dead letters, investigation annotations, outbox records, and API audit actions. The checkpoint remains in the baseline migration.
- [x] Add the initial integrity constraints and indexes for payout amounts/attempts/outcomes, ownership, due jobs, idempotency, ledger entities, and common lookups. Remaining provider-reference and expanded audit indexes are deferred with their related features.
- [x] Add migration-runner coverage for applying all migrations to an empty-database simulation. Live PostgreSQL empty-database execution remains required.
- [ ] Test upgrade from an MVP database snapshot without data loss against live PostgreSQL.
- [x] Remove dependency on `schema.ts` during normal application startup after migration adoption; retain it only as a legacy reference.
- [x] Define retention defaults and explicit cleanup for OTP challenges, sessions, token revocations, and published outbox events. External logs/exports and encrypted contacts remain pending an owner and policy decision.
- [x] Document that database transactions cannot imply rollback of an already committed Fabric transaction; reconciliation remains required for partial commits.
- [x] Add repository methods for bounded ledger-event queries with cursor pagination and projection reset/checkpoint operations. Domain-specific repositories for remaining tables are added with their features.

## Phase 3: Authentication, Authorization, and Privacy

- [x] Replace the current long-lived access-token-only flow with short-lived access tokens and rotating, revocable refresh sessions.
- [x] Store hashed refresh sessions for staff and beneficiaries, add logout/refresh rotation, reuse rejection, and JWT token revocation.
- [x] Add separate PostgreSQL-shared rate limits for login, OTP request, OTP verification, proof lookup, audit exports, and audit filters; hash limiter keys before storage.
- [x] Add strict existing OTP expiry/attempt handling, retention cleanup, and an injectable notification/OTP provider port.
- [x] Keep mock OTP delivery restricted to local/demo environments and reject `MOCK_OTP` in production.
- [x] Validate phone and synthetic Aadhaar-like input at the API boundary without persisting the raw Aadhaar-like value.
- [x] Centralize HMAC beneficiary-reference creation and AES-256-GCM contact encryption in `IdentityService`.
- [x] Add encryption/HMAC key-version metadata, configured current/previous key rings, controlled previous-key reads, and bounded token/key configuration; operational key replacement remains open.
- [x] Keep names, phones, Aadhaar-like values, bank data, secrets, and private commitments out of Fabric payloads and public responses; projection payloads use sensitive-field redaction.
- [x] Add reusable organization/district authorization helpers and recursive sensitive-field redaction utilities; structured log/trace integration remains open.
- [ ] Test positive and negative role, organization, and district permissions for every protected use case; unit policy tests pass, but live request authorization remains open.

## Phase 4: Reliable Funds and Disbursement Workflows

- [ ] Validate source ownership and source type by organization.
- [ ] Enforce positive integer amounts, source balance, allocation balance, beneficiary eligibility, and legal status transitions.
- [ ] Make public references collision-safe and preserve stable references for repeated requests.
- [ ] Persist idempotency before external effects where possible and return the original result for duplicate requests.
- [ ] Add disbursement batches, batch-level state, approval metadata, and high-value/maker-checker approval hooks.
- [ ] Add reversal authorization, reason validation, linkage to the original settlement, and protection against duplicate reversal.
- [ ] Implement the payout saga: validate, reserve, ledger-initiate, provider-submit, provider-confirm/fail, ledger-finalize, and project.
- [ ] Add a provider port with the simulator behind it; make simulated outcomes available only in explicit demo mode.
- [ ] Persist every payout attempt, provider reference, status transition, error, and retry decision.
- [ ] Add `UNKNOWN` for ambiguous provider timeouts and reconcile by provider reference.
- [ ] Never create a second logical payout automatically after an ambiguous timeout.
- [ ] Publish non-ledger application events through a transactional outbox.

## Phase 5: Durable Worker and Recovery Behavior

- [ ] Replace the in-process `running` flag with atomic database job leasing and lease expiry.
- [ ] Support multiple workers without allowing two workers to process the same payout.
- [ ] Add exponential backoff, configurable attempt limits, and dead-letter state.
- [ ] Make job completion, payout state, allocation balances, and attempt history transactionally consistent.
- [ ] Make worker restart safe and resume due work after a crash.
- [ ] Add operator-visible retry history and dead-letter/retry actions through the audit/operator API as appropriate.
- [ ] Add recovery tests for worker restart, duplicate delivery, provider timeout, partial commit, exhausted retries, and stale leases.

## Phase 6: Ledger Adapter and PostgreSQL Indexer

- [ ] Keep memory mode available for API development, but label its receipts clearly as simulated/development proofs.
- [ ] Keep Fabric mode organization-aware, using the correct Government or NGO gateway identity for owned operations.
- [ ] Standardize ledger transaction arguments, return values, receipt shape, and event payloads with the blockchain team.
- [ ] Add a durable committed-block event subscription for Fabric mode.
- [ ] Persist an indexer checkpoint and resume from the checkpoint after restart.
- [ ] Make event processing idempotent by block/transaction/event identity.
- [ ] Rebuild PostgreSQL projections from trusted ledger events.
- [ ] Reconcile rebuilt projections against ledger state and expose discrepancies.
- [ ] Define behavior for missed events, malformed events, invalid commits, peer outages, and checkpoint corruption.
- [ ] Expose projection lag, last confirmed block, and indexer state through health and public freshness metadata.
- [ ] Test replay from an empty projection database and verify totals against ledger fixtures.

## Phase 7: Public, Beneficiary, and Auditor Backend APIs

- [ ] Keep public queries privacy-filtered and aggregate-only.
- [ ] Add bounded date ranges, cursor pagination, and filters for audit/event endpoints.
- [ ] Add public filters for disaster, date, district, scheme, source, and status as API capabilities.
- [ ] Suppress small cohorts and prevent exposure of internal beneficiary commitments.
- [ ] Return clear pending-versus-confirmed status and active ledger/projection freshness metadata.
- [ ] Add privacy-safe proof lookup validation and failure responses.
- [ ] Keep beneficiary responses limited to the authenticated beneficiary and minimal necessary status/contact data.
- [ ] Add auditor filters for organization, district, scheme, event, status, amount, date, transaction ID, and public reference.
- [ ] Add exception queries for stale pending payouts, failed jobs, projection lag, discrepancies, and repeated reversals.
- [ ] Add a linked audit timeline for ledger events, application actions, payout attempts, and projections.
- [ ] Extend export with a JSON manifest containing filters, timestamp, row count, and content hash.
- [ ] Add off-chain investigation notes and case status without changing ledger history.

## Phase 8: API Quality and Observability

- [ ] Standardize errors as `code`, `message`, `correlationId`, and field-level `details`.
- [ ] Add correlation IDs across HTTP requests, Fabric transactions, payout attempts, and projection processing.
- [ ] Add structured logs, metrics, and traces with PII/secrets redaction.
- [ ] Add liveness, readiness, migration, database, Fabric, worker, and projection health indicators.
- [ ] Track API availability, Fabric commit duration, projection lag, payout duration, queue failures, and reconciliation discrepancies.
- [ ] Enforce OpenAPI compatibility in CI.
- [ ] Add request bounds, query limits, timeout handling, and cancellation for expensive operations.
- [ ] Update `main.ts`, configuration validation, Docker/runtime configuration, and deployment runbooks for the new modules and secrets.

## Phase 9: Backend Test and Release Evidence

- [ ] Expand domain unit tests for money, balances, roles, idempotency, transitions, reversals, and privacy helpers.
- [ ] Add API integration tests against PostgreSQL and the migration system.
- [ ] Add Fabric integration tests for organization authorization, endorsement outcomes, commits, events, and replay using agreed fixtures.
- [x] Add focused contract/security tests for token configuration, shared rate limits, identity privacy/key rings, authorization policies, redaction, and shared validation; live request authorization and PII/log scans remain open.
- [ ] Add contract tests for the complete OpenAPI requests/responses and ledger-event schemas.
- [ ] Add security tests for live RBAC, organization/district isolation, rate limits, PII leakage, secret leakage, and redaction.
- [ ] Add resilience tests for provider timeout, duplicate request/webhook, worker restart, peer outage, projection reset, and replay.
- [ ] Add performance tests for dashboard reads, batch submission, audit export bounds, and replay catch-up.
- [ ] Run formatting, linting, type checks, unit tests, migration tests, integration tests, dependency audits, secret scans, PII scans, and OpenAPI compatibility checks in CI.
- [ ] Record evidence for migration, deployment, rollback, restore, projection rebuild, worker recovery, and key/session rotation.

## Suggested Delivery Order

1. Contract freeze and current behavior tests.
2. Controller/module/service refactor with unchanged API behavior.
3. Baseline and versioned migrations.
4. Authentication/session/privacy hardening.
5. Funds/disbursement domain cleanup and idempotency.
6. Payout saga, attempts, leasing, retries, dead letters, and recovery.
7. Ledger adapter contract and durable indexer/replay.
8. Public, beneficiary, and auditor query improvements.
9. Observability, security scans, resilience, performance, and release evidence.

## Backend Completion Gate

Backend work is ready for pilot integration when:

- [ ] Existing API behavior is covered by integration tests and OpenAPI is checked in.
- [ ] Fresh and upgraded databases work through migrations only.
- [ ] Organization, district, role, and beneficiary isolation tests pass positively and negatively.
- [ ] Duplicate, timeout, partial-commit, worker-restart, dead-letter, and replay scenarios are safe.
- [ ] PostgreSQL projections can be rebuilt and reconcile with authoritative ledger events.
- [ ] Public APIs, logs, traces, metrics, exports, and events contain no prohibited PII or secrets.
- [ ] Health endpoints expose database, ledger, worker, migration, and projection state.
- [ ] CI produces passing compatibility, security, resilience, and performance evidence.
- [ ] The lightweight demo API remains usable for frontend-only demonstrations while backend tests use `apps/api`.

## Coordination Required

- Blockchain team: transaction arguments, state transitions, endorsement expectations, event envelope, event fixtures, and Fabric commit/indexing behavior.
- Platform team: PostgreSQL environments, secrets manager, CI/CD, telemetry, backups, restore drills, and deployment health checks.
- QA/security team: acceptance fixtures, privacy scans, RBAC matrix, resilience scenarios, and release evidence.
- Client teams: versioned OpenAPI, stable status names, error codes, pagination, proof shape, and OTP/session behavior.