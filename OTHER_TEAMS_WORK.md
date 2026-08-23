# ReliefChain Work for Other Teams

This document lists work outside the backend team. Backend contracts and current behavior are documented in [BACKEND_WORKFLOW.md](BACKEND_WORKFLOW.md), [BACKEND_CONTRACTS.md](BACKEND_CONTRACTS.md), and [openapi.json](openapi.json).

## Frontend Web Team

Own `apps/web`.

- [ ] Generate and use a typed client from `openapi.json`.
- [ ] Support short-lived access tokens, refresh-token rotation, logout, expiry, and session recovery.
- [ ] Handle `401`, `403`, `409`, `429`, `UNKNOWN`, and validation errors consistently.
- [ ] Update operator workflows for fund sources, allocations, beneficiaries, disbursements, reversals, and payout batches.
- [ ] Add batch review, maker-checker approval, submission progress, partial failure, and retry/reconciliation views.
- [ ] Add a provider-reference reconciliation workflow for `UNKNOWN` payouts.
- [ ] Display organization and district restrictions before submitting an operation.
- [ ] Keep simulated outcomes visible only in explicit demo mode.
- [ ] Update public proof and dashboard views for `UNKNOWN`, pending, settled, failed, and reversed statuses.
- [ ] Add public filters for disaster, date, district, scheme, source, and status.
- [ ] Add auditor filters, exception views, status-history timelines, payout-attempt details, and batch information.
- [ ] Add CSV export handling and prepare for the future JSON export manifest.
- [ ] Remove API-facing `any` usage and keep client types synchronized with OpenAPI.
- [ ] Add loading, empty, error, retry, cancellation, offline, and token-expiry states.
- [ ] Complete keyboard, screen-reader, contrast, focus, zoom, reduced-motion, English, and Hindi acceptance testing.
- [ ] Add component documentation, visual regression tests, and web E2E tests.

## Mobile Team

Own `mobile`.

- [ ] Generate the Android wrapper and commit the required platform configuration.
- [ ] Generate or maintain a Dart client from `openapi.json`.
- [ ] Implement access-token refresh, secure logout, session restoration, and secure token storage.
- [ ] Handle OTP rate limits, expiry, invalid codes, resend countdown, and attempt feedback.
- [ ] Display `PENDING`, `SETTLED`, `FAILED`, `UNKNOWN`, and `REVERSED` payment states.
- [ ] Show cache age and refresh controls for minimal last-known status data.
- [ ] Test timeout, offline, stale cache, low bandwidth, invalid OTP, no eligibility, failure, reversal, and session expiry.
- [ ] Keep beneficiary references, raw identifiers, bank data, and private commitments out of QR/share flows.
- [ ] Complete Hindi/English localization, text scaling, screen-reader, and TTS testing.
- [ ] Add Android flavors, signing placeholders, reproducible builds, and device/integration tests.

## Blockchain Team

Own `fabric/chaincode`, `fabric/network`, and Fabric lifecycle scripts. Coordinate with backend on `apps/api/src/ledger.ts` and shared ledger contracts.

- [ ] Approve the versioned ledger-event envelope and fixtures.
- [ ] Keep transaction arguments and return values synchronized with `LedgerPort`.
- [ ] Add and verify chaincode support for `UNKNOWN` reconciliation, linked reversals, payout batches, and status transitions.
- [ ] Emit safe events for every accepted transition, including status-history metadata that contains no PII.
- [ ] Verify organization authorization and endorsement policies for GovernmentMSP, NgoMSP, and AuditorMSP.
- [ ] Replace demo cryptogen identities with Fabric CA registration, enrollment, renewal, revocation, and rotation.
- [ ] Add deterministic serialization, transaction-context timestamps, composite keys, and bounded queries.
- [ ] Add state-based endorsement for high-value or high-risk reversals.
- [ ] Test duplicate prevention, balances, transitions, reversals, event payloads, migrations, and multi-organization endorsement.
- [ ] Build the durable committed-block event subscription contract required by the backend indexer.
- [ ] Test peer rebuild, snapshot/restore, rejoin, certificate rotation, and event replay without reconciliation loss.
- [ ] Pin Fabric images and dependencies by tested version/checksum.

## Platform and Operations Team

Own environments, deployment, secrets, telemetry, backups, and operational runbooks.

- [ ] Provide PostgreSQL local, CI, staging, and pilot environments.
- [ ] Run live migration tests from an empty database and an MVP snapshot.
- [ ] Provide a secrets manager for database, JWT, encryption, HMAC, Fabric, provider, and notification secrets.
- [ ] Ensure production does not receive `MOCK_OTP` or simulated payout configuration.
- [ ] Schedule `RetentionService.purgeExpired()` and define ownership for log, export, and encrypted-contact retention.
- [ ] Provide shared rate-limit storage operation and cleanup monitoring.
- [ ] Add centralized structured logs, metrics, traces, alerts, and deployment annotations with PII redaction.
- [ ] Monitor API availability, database health, Fabric commit duration, worker failures, projection lag, payout duration, and queue/dead-letter counts.
- [ ] Add liveness, readiness, migration, Fabric, worker, and projection health probes to deployment systems.
- [ ] Build immutable images by commit SHA and run dependency/image/secret scans.
- [ ] Configure TLS/domain automation, network segmentation, WAF/rate controls, least-privilege containers, and read-only filesystems where possible.
- [ ] Back up PostgreSQL, Fabric channel configuration, peer snapshots, and operational metadata.
- [ ] Run restore drills and document API, database, peer/orderer, queue, indexer, key-exposure, failed-deployment, and rollback procedures.

## QA and Security Team

Own cross-system test evidence and release-blocking checks.

- [ ] Build the shared fixture set for roles, organizations, districts, balances, states, events, and expected totals.
- [ ] Run government/NGO isolation tests and verify district restrictions.
- [ ] Test duplicate idempotency requests, mismatched idempotency keys, provider timeouts, `UNKNOWN` reconciliation, reversals, and batch approval separation.
- [ ] Test worker restart, duplicate delivery, partial ledger/database commit, projection reset, and replay.
- [ ] Test OpenAPI compatibility and generated client compilation.
- [ ] Scan Fabric payloads, public APIs, logs, traces, metrics, exports, source control, and mobile artifacts for prohibited PII and secrets.
- [ ] Verify public cohort suppression and beneficiary isolation.
- [ ] Run SAST, dependency, image, secret, PII, penetration, and configuration scans.
- [ ] Run web/mobile accessibility, localization, offline, device, and E2E tests.
- [ ] Run performance tests for dashboard reads, batch submission, bounded audit exports, and projection replay.
- [ ] Block release on incorrect amounts, cross-organization access, duplicate payouts, missing ledger events, failed reconciliation, or PII exposure.
- [ ] Record evidence for migration, deployment, rollback, restore, key/certificate rotation, recovery, and acceptance gates.

## Product and Architecture Owners

- [ ] Approve domain vocabulary, money representation, identifiers, state transitions, RBAC, event schemas, and API compatibility.
- [ ] Approve maker-checker thresholds and high-value reversal policy.
- [ ] Define geography scope and organization permissions beyond the current MVP.
- [ ] Approve privacy thresholds, retention periods, consent language, and investigation-note policy.
- [ ] Record significant decisions as ADRs under `docs/decisions/`.
- [ ] Require updates to `BACKEND_WORKFLOW.md`, `BACKEND_CONTRACTS.md`, `openapi.json`, and this document whenever a shared contract changes.

## Integration Gates

1. Shared contracts and fixtures are approved.
2. Generated web/mobile clients compile against `openapi.json`.
3. Chaincode events and backend ledger fixtures agree.
4. PostgreSQL and Fabric integration environments are available.
5. Government, NGO, beneficiary, public, and auditor E2E flows pass.
6. Security, accessibility, performance, backup, restore, and recovery evidence is recorded.
7. Product, engineering, QA, security, and operations owners approve the pilot release.

## Out of Scope

- Real UIDAI/Aadhaar integration without formal authorization.
- Real payouts without an approved provider and compliance process.
- Public cryptocurrency, tokens, or beneficiary wallets.
- Personal data on Fabric.
- Production or nationwide claims before pilot acceptance gates pass.
