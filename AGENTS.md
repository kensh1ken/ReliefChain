# AGENTS.md

## Purpose and scope

This file applies to the entire repository. ReliefChain is a hackathon MVP for tracing synthetic disaster-relief funds. It is not a production banking, identity, payment, or government system. Keep all identities, balances, OTPs, and payouts synthetic, and do not describe simulated behavior as real-world verification.

## Repository map

- `apps/api/`: the real NestJS API. PostgreSQL owns private operational state and projections; `LedgerService` selects the in-memory or Fabric adapter.
- `apps/demo-api/`: a separate lightweight in-memory server for frontend-only demos. It is not the production-shaped backend and competes with the real API for port 4000.
- `apps/web/`: Next.js App Router public, operator, and auditor experiences.
- `packages/contracts/`: shared Zod schemas, ledger envelopes, privacy helpers, and compatibility fixtures. Treat these as the machine-readable contract source of truth.
- `fabric/chaincode/`: Hyperledger Fabric TypeScript chaincode and pure domain logic.
- `fabric/network/`: single-host, three-organization demo network configuration.
- `mobile/`: Flutter beneficiary client using Provider, Dio, secure token storage, Hive caching, localization, and TTS.
- `scripts/`: Fabric lifecycle helpers and the live smoke test.
- `docs/`, `ARCHITECTURE.md`, `BACKEND_CONTRACTS.md`, and `BACKEND_WORKFLOW.md`: architecture, security, and interface rationale.

Important implementation details:

- Active Nest controllers are in `apps/api/src/controllers/` and are registered through feature modules. `apps/api/src/controllers.ts` is a legacy, unregistered duplicate; do not add features there.
- Database startup uses ordered files in `apps/api/src/migrations/` through `migrations/runner.ts`. `apps/api/src/schema.ts` is not the runtime schema initializer.
- The web and mobile clients call the API; neither client talks directly to Fabric.
- `openapi.json` is checked-in contract documentation, while runtime Swagger is created in `apps/api/src/main.ts`. Keep both aligned when HTTP behavior changes.

## Sources of truth and compatibility

Read these before changing a boundary:

1. `packages/contracts/src/` and `packages/contracts/fixtures/` for executable schemas and fixtures.
2. `BACKEND_CONTRACTS.md` for HTTP, money, status, event, and privacy semantics.
3. `docs/decisions/ADR-001-ledger-contract-v1.md` for the frozen Fabric v1 decision.
4. `ARCHITECTURE.md` and `docs/SECURITY.md` for ownership and trust boundaries.
5. `HOW_TO_USE.md` for the full local/Fabric runbook.

Fabric contract v1 has eight frozen write transaction names and positional argument prefixes. Within v1, changes must be additive. Breaking transaction arguments, return shapes, event schemas, money semantics, privacy semantics, or state transitions require a new schema version and an ADR.

Money is integer paise. Never use floating point across API, database, or ledger boundaries. Fabric receives canonical positive decimal strings with the current maximum of `1000000000000` paise.

The shared status vocabulary includes off-chain `UNKNOWN`; Fabric v1 keeps an ambiguous payout `PENDING` until reconciliation finalizes it as `SETTLED` or `FAILED`.

## Privacy and security invariants

- Never put names, phones, Aadhaar-like identifiers, OTPs, raw bank/provider references, idempotency keys, secrets, detailed provider errors, or internal notes in Fabric events, public responses, logs, fixtures, or screenshots.
- Beneficiary identity linkage uses an HMAC reference. Contact fields belong encrypted in PostgreSQL. Provider references sent to Fabric must be SHA-256 hashes.
- Preserve role, organization, district, and beneficiary isolation. Government and NGO writes are organization-scoped; auditors are read-only; beneficiaries may read only their own view.
- Public aggregates must preserve the minimum-cohort protection (currently at least three distinct beneficiaries).
- Keep redaction recursive and event payloads allowlisted. Reject unsupported event versions instead of coercing them.
- Do not commit `.env`, generated MSP material, keys, certificates, database data, tokens, or release signing material. Do not weaken production guards around mock OTP or simulated payouts.

## Working conventions

- Use Node.js 20+ and npm workspaces. Prefer root workspace commands or `-w <workspace>` over running ad hoc tools.
- TypeScript is strict. Reuse schemas and exported types from `@reliefchain/contracts`; do not duplicate wire enums or validation rules in new code.
- Follow the local file's style and avoid drive-by formatting. The repository contains both compact backend files and deliberately spacious UI files.
- Parameterize all SQL values. Keep multi-step balance, reservation, job, and projection changes inside database transactions.
- Schema changes require a new monotonically numbered migration, registration in `migrations/runner.ts`, and migration tests. Never edit an applied migration to evolve an existing database.
- Keep ledger/domain logic deterministic. Fabric timestamps and transaction IDs come from the transaction context; do not use wall-clock time or randomness inside chaincode handlers.
- Preserve idempotency before external effects. An ambiguous provider result must not create a second logical payout.
- Add or update focused tests beside the affected TypeScript code (`*.test.ts`). Include negative authorization, invariant, transition, privacy, and malformed-input cases where relevant.
- For UI changes, retain accessibility, loading/error/empty states, responsive layouts, English/Hindi behavior, and offline cached reads where applicable.

## Generated and derived files

- Do not hand-edit `mobile/lib/models/*.g.dart`; regenerate them with build_runner after model annotation changes.
- `mobile/lib/l10n/app_localizations*.dart` is generated from `mobile/lib/l10n/app_en.arb` and `app_hi.arb`; update both ARB files, then run localization generation.
- Do not edit dependency/build output such as `node_modules/`, `dist/`, `.next/`, `coverage/`, `mobile/build/`, or `mobile/.dart_tool/`.
- Fabric identities, credentials, channel artifacts, and chaincode packages are generated local state and must remain untracked.

## Setup and verification

Install JavaScript dependencies from the repository root:

```bash
npm ci
```

Useful root checks:

```bash
npm run typecheck
npm test
npm run build
```

Prefer the narrowest relevant checks while iterating:

```bash
npm run typecheck -w @reliefchain/contracts
npm test -w @reliefchain/contracts
npm run typecheck -w @reliefchain/chaincode
npm test -w @reliefchain/chaincode
npm run typecheck -w @reliefchain/api
npm test -w @reliefchain/api
npm run typecheck -w @reliefchain/web
npm run build -w @reliefchain/web
```

There is no configured JavaScript lint or format script; do not claim one was run.

For Flutter, run from `mobile/`:

```bash
flutter pub get
flutter gen-l10n
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

The checked-in `mobile/test/widget_test.dart` is still the default counter scaffold and references `MyApp`, which the current application does not define. Treat that as a known baseline defect if a full Flutter test run fails; replace it with a real `ReliefChainApp`/bootstrap test when working on mobile tests rather than masking the failure.

The live smoke test requires running services:

```bash
RELIEFCHAIN_URL=http://localhost:4000 node scripts/smoke-test.mjs
```

The current smoke validator expects `source === "FABRIC_INDEX"`, so it is a Fabric-mode integration check, not a memory-mode smoke check.

## Local runtime choices

For a UI-only demo, run these in separate terminals:

```bash
npm run demo:api
npm run dev:web
```

For the real API, configure `.env` from `.env.example`, run PostgreSQL, then use `npm run dev` (root) or `npm run dev -w @reliefchain/api`. The API prefix is `/api/v1`; local web development normally needs `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`.

Use `LEDGER_MODE=memory` only for development and label its receipts as simulated. A real Fabric claim requires the running network, deployed chaincode, health/readiness checks, and the live smoke test.

Flutter API URLs are compile-time values supplied with `--dart-define=API_URL=...`. Android emulators use `http://10.0.2.2:4000/api/v1`; physical devices use the host's reachable LAN address; deployed builds should use HTTPS.

## Fabric and destructive-operation safety

- Run Fabric Bash scripts from Ubuntu/WSL 2 with Linux Docker, not directly from PowerShell or Git Bash.
- `scripts/fabric-up.sh` is first-time initialization: it regenerates cryptographic material. Do not use it for routine restarts when Fabric volumes already exist.
- Routine order is Fabric network first, then PostgreSQL/API, then web/mobile.
- A chaincode package already being installed does not mean its lifecycle definition is committed. Query the committed definition before changing `CHAINCODE_SEQUENCE`; increment the sequence only for a real upgrade.
- Never delete Fabric organizations, credentials, artifacts, or Docker volumes unless the user explicitly requests a complete disposable reset and the exact repository path has been verified. Such a reset is irreversible for local ledger/database state.

## Before handing off a change

- Review `git diff` and preserve unrelated user changes.
- Run the narrow tests/type checks for every touched area; run broader checks when changing shared contracts or cross-layer behavior.
- Update schemas, fixtures, OpenAPI, clients, docs, and tests together when a boundary changes.
- State which checks ran, which did not, and whether failures are caused by missing tools/services or by the change itself.
- Keep hackathon limitations explicit: synthetic data, simulated OTP/payout provider, single-host Fabric, and no production-readiness claim.
