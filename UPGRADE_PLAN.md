# ReliefChain Upgrade Plan

**Status:** Implementation roadmap  
**Audience:** Frontend, mobile, backend, blockchain, platform, QA, security, and product teams  
**Target:** Upgrade the hackathon MVP into a pilot-ready system while keeping the current demo usable

## 1. Purpose

The MVP proves the core idea: government and NGO funds can be allocated, simulated payouts can be tracked, beneficiaries can verify status, and auditors can reconcile events. The upgrade must turn that demonstration into a maintainable, secure, observable, and testable platform.

This document defines scope, ownership, dependencies, milestones, acceptance gates, and release criteria. System boundaries and data flows are defined in [ARCHITECTURE.md](ARCHITECTURE.md).

## 2. Current Baseline

| Area | Current implementation | Main limitation |
|---|---|---|
| Public web | Next.js summary, district bars, and proof lookup | Large page components, limited analytics, accessibility, and error handling |
| Operator web | Shared government/NGO transaction console | No batch review, approvals, CSV validation, or guided workflows |
| Auditor web | Reconciliation, event list, CSV export | Limited filters, exception detection, and investigation workflow |
| Mobile | Flutter source with OTP, Hindi/English, cache, and TTS | Android wrapper/release pipeline and device tests are incomplete |
| Backend | NestJS, PostgreSQL, JWT/RBAC, OTP, encryption, payout worker | Large combined modules, startup schema SQL, limited job recovery and session management |
| Demo backend | In-memory local API | Non-persistent and intentionally not production-capable |
| Blockchain | Three Fabric organizations and Node chaincode | Single-host topology, cryptogen bootstrap, limited endorsement and upgrade operations |
| Projection | API records submitted transaction receipts | No durable peer block-event replay from checkpoint |
| Platform | Docker Compose, Caddy, VM runbook | No CI/CD, secrets manager, centralized telemetry, or tested restore procedure |
| Tests | Domain/privacy unit tests and production builds | Missing database/Fabric integration, web/mobile E2E, resilience, and load tests |

## 3. Upgrade Goals

1. Preserve privacy: no Aadhaar, phone, OTP, name, or bank account in Fabric, public APIs, telemetry, exports, or source control.
2. Keep Fabric authoritative for financial events and make PostgreSQL projections rebuildable.
3. Provide focused, accessible workflows for public users, operators, beneficiaries, and auditors.
4. Make payout processing idempotent and durable across retries, timeouts, and worker restarts.
5. Replace development Fabric identities with CA enrollment, rotation, and revocation.
6. Support repeatable local, CI, staging, and pilot deployments.
7. Produce automated evidence for balance, authorization, privacy, reconciliation, and recovery invariants.

### Out of scope

- Real UIDAI/Aadhaar integration without formal authorization.
- Real payouts without an approved provider and compliance process.
- Public cryptocurrency, tokens, or beneficiary wallets.
- Personal data on Fabric, including private data collections.
- Nationwide or production claims before pilot acceptance gates pass.

## 4. Contracts to Freeze First

Parallel work begins only after these contracts are approved. Later breaking changes require an architecture decision record.

| Contract | Required decision | Owners | Deliverable |
|---|---|---|---|
| Domain vocabulary | Disaster, scheme, source, allocation, commitment, disbursement, settlement, reversal | Backend + blockchain | Shared types and glossary |
| Money | Integer paise and `INR`; no floating point | Backend | OpenAPI and chaincode schemas |
| Identifiers | UUID entities, opaque public references, HMAC beneficiary references | Backend + security | Identifier spec and test vectors |
| State machines | Allowed allocation and disbursement transitions | Blockchain + payments | Versioned transition table |
| API | `/api/v1` shapes, errors, pagination, idempotency | Backend + clients | Checked-in OpenAPI document |
| Ledger events | Versioned event envelope and privacy-safe payloads | Blockchain + indexer | JSON schemas and fixtures |
| Authorization | Roles, organization/geography scope, actions | Product + security | RBAC matrix and tests |
| UI structure | Public, operator, auditor, mobile routes and terminology | Product + frontend | Approved route map/wireframes |
| Environments | Local, CI, staging, pilot configuration | Platform | Environment and secret matrix |

## 5. Frontend Upgrade

### 5.1 Shared web foundation

- Build a design system with tokens for typography, color, spacing, status, focus, elevation, and responsive behavior.
- Split page files into modules for authentication, funds, allocations, beneficiaries, disbursements, proofs, and audits.
- Generate a typed TypeScript client from OpenAPI and remove API-facing `any` usage.
- Standardize server-state caching, retries, invalidation, cancellation, loading, empty, and error states.
- Enforce role and token-expiry guards before protected routes render.
- Add a global error boundary, offline indicator, correlation-ID display, and session recovery.
- Move all user-facing English/Hindi text into localization catalogs.
- Meet WCAG 2.2 AA for keyboard access, focus, contrast, labels, announcements, zoom, and reduced motion.
- Add component documentation and visual regression tests.

### 5.2 Public dashboard

- Add disaster, date, district, scheme, source, and status filters reflected in shareable URLs.
- Add an Assam district map with an accessible table alternative using stable district codes.
- Add received-to-settled flow, time trends, source composition, district comparison, and reconciliation explanations.
- Show ledger mode, last confirmed block, projection freshness, and clear pending-versus-confirmed labels.
- Improve proof lookup with validation, printable receipt, copy/share, and privacy-safe failure messages.
- Suppress small cohorts and never expose internal beneficiary commitments or private provider errors.

### 5.3 Government and NGO portal

- Replace the single form with guided, reviewable workflows and confirmation summaries.
- Add fund details, ownership labels, remaining balances, and allocation history.
- Add beneficiary CSV import with preview, row validation, duplicate detection, and redacted rejection reports.
- Add batch payout preparation, approval, submission, progress, partial failure, and retry views.
- Add configurable maker-checker approval for batches or high-value transactions.
- Add reversal initiation with authorization, reason, confirmation, and a link to the original settlement.
- Surface organization and district restrictions before submission.
- Show the simulated-outcome selector only in explicit demo mode.

### 5.4 Auditor portal

- Filter by organization, district, scheme, event, status, amount, date, transaction ID, and public reference.
- Add exceptions for stale pending payouts, failed jobs, projection lag, discrepancies, and repeated reversals.
- Link ledger history, application audit actions, payout attempts, and projections in one timeline.
- Export CSV plus a JSON manifest with filters, timestamp, row count, and content hash.
- Add off-chain investigation notes and case status without modifying ledger history.

### 5.5 Flutter beneficiary app

- Commit Android platform wrappers, flavors, signing placeholders, and a reproducible release pipeline.
- Generate the Dart client from OpenAPI; keep tokens only in secure storage.
- Add resend countdown, attempt feedback, expiry, session restoration, and secure logout/cache deletion.
- Move Hindi/English text to localization catalogs and verify text scaling, screen readers, and TTS on devices.
- Cache only minimal last-known status and show cache age and refresh controls.
- Add proof sharing/QR without exposing the HMAC commitment.
- Test low bandwidth, timeout, offline, stale cache, invalid OTP, no eligibility, failure, reversal, and expiry.

### Frontend acceptance gate

- Protected routes enforce the RBAC matrix.
- Generated clients compile without API-facing `any`.
- Critical flows pass desktop/mobile viewport, keyboard, English, Hindi, and screen-reader smoke tests.
- Public HTML and telemetry contain no PII or private commitment.
- Staging Lighthouse targets: accessibility 95+, performance 85+ on the agreed profile.

## 6. Backend Upgrade

### 6.1 Modularize the NestJS application

Create modules with narrow exported interfaces:

- `AuthModule`: staff login, refresh sessions, OTP, revocation, rate limits.
- `IdentityModule`: HMAC references, encryption, contact lookup, retention, key versions.
- `DisasterModule`: disasters, schemes, districts, eligibility metadata.
- `FundsModule`: sources, allocations, ownership, balances.
- `DisbursementModule`: requests, batches, transitions, reversals.
- `PayoutModule`: provider port, simulator, attempts, retries, dead letters.
- `LedgerModule`: Fabric gateway, submit/evaluate, receipts.
- `IndexerModule`: block subscription, checkpoint, replay, projections.
- `PublicModule`: privacy-filtered queries and proofs.
- `AuditModule`: reconciliation, event search, exports, annotations.

Controllers handle transport validation only. Application services orchestrate use cases; domain services enforce invariants; repositories and external services remain behind ports.

### 6.2 Database and migrations

- Replace startup table creation with versioned migrations.
- Add staff sessions, token revocation, payout batches, attempts, dead letters, annotations, checkpoints, outbox, and API audit actions.
- Enforce unique public references, idempotency keys, provider references, and block/event identity.
- Never assume a database rollback can undo a committed Fabric transaction.
- Rebuild missing projections from peer block events and reconcile them with chaincode state.
- Define retention for OTPs, sessions, logs, exports, and encrypted contacts.

### 6.3 Authentication and privacy

- Use short-lived access tokens and rotating server-revocable refresh sessions.
- Enforce role, organization, and district scope at controller and use-case boundaries.
- Rate-limit login, OTP request/verification, proof lookup, export, and expensive filters separately.
- Introduce notification/OTP ports; mock delivery exists only in local/demo environments.
- Store application, database, Fabric, encryption, HMAC, and JWT secrets in a secrets manager.
- Version encryption and HMAC keys to support controlled rotation.
- Redact secrets and PII from logs, errors, traces, and metrics.

Current backend progress: short-lived access tokens, hashed rotating refresh sessions, logout/JWT revocation, PostgreSQL-shared endpoint rate limits, mock-only OTP provider wiring, bounded token configuration, configured key-ring support, centralized identity/privacy operations, reusable authorization checks, and projection redaction are implemented. Production notification delivery, full structured telemetry integration, and live integration tests remain open.

### 6.4 Reliable payout orchestration

- Implement a saga: validate, reserve, ledger-initiate, provider-submit, provider-confirm/fail, ledger-finalize, project.
- Persist idempotency before external effects and return the original result for repeated requests.
- Lease jobs atomically so multiple workers cannot process one payout.
- Add exponential backoff, attempt limits, dead-letter state, and operator-visible retry history.
- Treat ambiguous provider timeouts as `UNKNOWN`; reconcile by provider reference and never create a second payout automatically.
- Publish non-ledger application events through a transactional outbox.

Current backend progress: source ownership validation, collision checks, pre-effect idempotency reservations, maker-checker payout batches, provider-attempt persistence, `UNKNOWN` provider handling, immutable status-transition history, provider-reference reconciliation, and transactional outbox writes are implemented. Worker leasing/backoff remains in later hardening work.

### 6.5 API and observability

- Check in OpenAPI and enforce compatibility in CI.
- Standardize errors as `code`, `message`, `correlationId`, and field-level `details`.
- Add cursor pagination and bounded date ranges to event/audit endpoints.
- Add liveness, readiness, migration, Fabric, worker, and projection health indicators.
- Correlate structured logs, metrics, and traces across API, Fabric transaction, payout attempt, and projection.
- Monitor API availability, Fabric commit duration, projection lag, payout duration, and queue failures.

### Backend acceptance gate

- Migrations create a fresh database and upgrade an MVP snapshot.
- Integration tests run against PostgreSQL and a Fabric test network.
- Duplicate, timeout, partial-commit, worker-restart, and replay scenarios are safe.
- OpenAPI compatibility and RBAC matrix tests pass.
- Automated scans find no PII or secrets in responses and logs.

## 7. Blockchain Upgrade

### 7.1 Identity and topology

- Replace cryptogen application identities with Fabric CA registration and enrollment.
- Define certificate attributes for role, organization, geography where needed, and service identity.
- Use separate Government and NGO gateway identities; auditor application identities are read-only.
- Separate organizations across hosts/failure domains and use three Raft orderers for pilot resilience.
- Enable TLS, expiry alerts, renewal, revocation lists, MSP updates, and documented rotation.

### 7.2 Chaincode

- Separate transaction parsing from pure deterministic domain logic.
- Add a versioned asset/event envelope: `schemaVersion`, `eventType`, `entityType`, `entityId`, `occurredAt`, safe payload.
- Add batch-aware initiation, finalization, reconciliation markers, and linked reversals.
- Use transaction-context timestamps and deterministic serialization.
- Use composite keys/indexed access instead of unbounded world-state scans.
- Add state-based endorsement for high-risk actions.
- Keep all beneficiary PII off-chain; private collections require a separate privacy review.
- Emit a safe versioned event for every accepted transition.

### 7.3 Endorsement baseline

| Operation | Minimum policy target |
|---|---|
| Government source/allocation | Government organization |
| NGO source/allocation | NGO organization |
| Disbursement initiation | Owning source organization |
| Settlement/failure | Owning organization plus designated settlement policy |
| High-value reversal | Owning organization plus configured oversight/second approval |
| Query | Any synchronized authorized peer |

Application RBAC is an additional control, not a substitute for chaincode authorization and endorsement.

### 7.4 Lifecycle and migration

- Automate packaging, installation, organization approval, commit, and verification.
- Pin Fabric images and dependencies by tested version/checksum.
- Test chaincode sequence/version compatibility before approval.
- Use additive schemas first and provide idempotent migration transactions or read compatibility.
- Back up channel configuration and document peer snapshot, restore, join, and certificate rotation.
- Block deployment when peer health, endorsements, or migration prerequisites fail.

### Blockchain acceptance gate

- Authorization, endorsement, determinism, duplicate prevention, balances, transitions, reversals, and migrations pass on a multi-organization network.
- A peer can be rebuilt and rejoin without reconciliation loss.
- CA enrollment, renewal, revocation, and gateway rotation are demonstrated.
- Chaincode events rebuild PostgreSQL projections from a trusted start point.

## 8. Platform, Security, and Operations

- Provide one-command Docker local startup; retain `demo:api` for frontend-only work.
- Isolate CI, staging, and pilot credentials and data.
- Run formatting, lint, types, units, migrations, chaincode integration, web/mobile E2E, image build/scan, dependency audit, and OpenAPI compatibility in CI.
- Publish immutable images by commit SHA and promote the same image between environments.
- Inject secrets at runtime from a managed store; never place them in images or client builds.
- Add TLS/domain automation, database backups, Fabric snapshots, retention, and restore drills.
- Centralize logs, metrics, traces, alerts, and deployment annotations.
- Apply container least privilege, network segmentation, rate/WAF controls, and read-only filesystems where possible.
- Write runbooks for API, database, peer/orderer, queue, indexer, key exposure, failed deployment, and restore incidents.

## 9. Test Strategy

| Layer | Coverage |
|---|---|
| Domain unit | Money, balances, roles, idempotency, states, reversal, privacy helpers |
| Chaincode unit | Determinism, MSP/attribute authorization, keys, event payloads |
| API integration | Migrations, auth, organization scope, rate limits, jobs, exports |
| Fabric integration | Three organizations, endorsement, commits, events, replay |
| Contract | OpenAPI clients and ledger-event fixtures |
| Web E2E | Public proof, government, NGO isolation, auditor export, session expiry |
| Mobile integration | OTP, status, cache, localization, offline, accessibility |
| Security | SAST, dependency/image/secret scans, RBAC and PII scans |
| Resilience | Worker restart, peer outage, projection reset, duplicate request/webhook |
| Performance | Dashboard reads, batch submit, replay catch-up, bounded audit export |

Incorrect amounts, cross-organization access, duplicate payout, missing ledger event, or PII exposure always block release.

## 10. Work Division

| Team | Primary ownership | Shared dependency |
|---|---|---|
| Frontend Web | Design system and public/operator/auditor UX | OpenAPI, RBAC, translations |
| Mobile | Flutter app and Android release | Beneficiary API, OTP behavior |
| Backend Core | API modules, database, auth, public/audit services | Event schemas and state machine |
| Backend Payments | Saga, jobs, provider ports, reconciliation | Disbursement/idempotency contract |
| Blockchain | Fabric network, CA/MSP, chaincode, lifecycle | Event and asset schemas |
| Platform | Environments, CI/CD, secrets, telemetry, backup | Health, port, image, persistence contracts |
| QA/Security | Test harness, privacy/security and release evidence | All frozen contracts |

### Integration order

1. Freeze domain, RBAC, OpenAPI, ledger events, states, and environment contracts.
2. In parallel: design system/mocked screens; API modules/migrations; chaincode domain/events; CI baseline.
3. Gate A: generated TypeScript/Dart clients compile; backend ledger adapter uses agreed fixtures.
4. In parallel: complete UX; payout saga/indexer; CA/topology; observability and test environments.
5. Gate B: government, NGO, beneficiary, public, and auditor E2E flows pass on real Fabric/PostgreSQL.
6. Harden accessibility, security, load, recovery, backup, rotation, migration, and rollback.
7. Deploy immutable pilot release and record reconciliation/go-no-go evidence.

## 11. Milestones

### M0 — Contract freeze

Architecture, glossary, RBAC matrix, OpenAPI, event envelope, states, and acceptance fixtures approved.

### M1 — Maintainable foundations

Modular API, migrations, design system, generated clients, refactored chaincode domain, and CI baseline merged.

### M2 — Complete workflows

Public analytics, operator batches, auditor exceptions, beneficiary release app, payout saga, and event indexer functional.

### M3 — Real network integration

CA identities, multi-organization network, endorsement, chaincode lifecycle, and event replay verified.

### M4 — Pilot hardening

Security, accessibility, performance, telemetry, restore, deployment, and incident runbooks pass.

## 12. Release Definition of Done

- Clients conform to versioned OpenAPI and ledger event contracts.
- Totals reconcile across source, allocation, pending, settlement, failure, and reversal.
- Projections rebuild and match Fabric totals.
- Organization/district authorization tests pass positively and negatively.
- No prohibited PII occurs in Fabric, public responses, telemetry, exports, or scans.
- Web/mobile critical flows pass accessibility and localization acceptance.
- No unresolved critical/high production dependency or image vulnerabilities remain.
- Migration, deployment, rollback, restore, peer recovery, and key/certificate rotation have recorded evidence.
- Product, engineering, QA, security, and operations owners approve release.

## 13. Key Risks

| Risk | Mitigation |
|---|---|
| API and chaincode models diverge | Shared fixtures, contract freeze, compatibility CI |
| Fabric commits but projection fails | Durable block replay, idempotent projector, lag alert, reconciliation |
| Provider timeout causes duplicate payout | Stable idempotency key, `UNKNOWN`, provider-reference reconciliation |
| PII enters events/logs | Payload allowlists, redaction, automated scans |
| Certificate expiry stops transactions | Monitoring, overlap renewal, tested rotation |
| Single host fails | Multi-host pilot, backups, peer snapshot/restore |
| Teams change shared contracts independently | Owners, semantic versioning, ADRs, compatibility checks |
| Frontend waits for backend | OpenAPI-generated mock server and shared fixtures |

## 14. Change Control

- Record significant decisions in `docs/decisions/ADR-NNN-title.md`.
- Changes to money, reference generation, transitions, endorsement, privacy thresholds, or compatibility require cross-team review.
- Prefer additive APIs and ledger schemas. Breaking changes require versioning, migration, and rollback.
- Keep the lightweight local demo functional after every milestone.
