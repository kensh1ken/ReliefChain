# ADR-001: Freeze ledger contract v1

- Status: Accepted
- Date: 2026-08-25
- Owners: Backend and Blockchain

## Context

The API currently submits untyped positional string arrays to eight Fabric transactions. Chaincode emits event-specific JSON without a versioned envelope, returns internal asset shapes, accepts raw provider references, and exposes free-text errors. Backend and blockchain changes therefore risk silent contract drift.

## Decision

Ledger contract v1 freezes the existing eight transaction names and positional argument order. No batch, linked-reversal, or explicit `UNKNOWN` transaction is added.

- Paise crosses the Fabric boundary as a canonical positive decimal string, capped at `1000000000000`.
- Transaction returns are privacy-safe asset views; the committed proof shape remains stable.
- Events use schema version `1` and require `eventType`, `entityType`, `entityId`, `occurredAt`, `transactionId`, `actorMsp`, and a strict event-specific payload.
- Event payloads use explicit allowlists. Raw beneficiary/provider identifiers, names, contact data, idempotency keys, detailed errors, secrets, and internal notes are prohibited.
- Fabric receives only a SHA-256 provider-reference hash. PostgreSQL retains the raw reference where operationally necessary.
- `UNKNOWN` remains off-chain. Fabric remains `PENDING` until reconciliation produces `SETTLED` or `FAILED`.
- Payout batches remain off-chain. Reversal v1 mutates the original disbursement; linked reversal assets are deferred.
- Errors use stable codes formatted as `[CODE] message`.
- Shared schemas and fixtures in `@reliefchain/contracts` are authoritative; documentation explains their semantics.

## Compatibility

V1 changes are additive and preserve existing transaction names and positional prefixes. A breaking wire, event, privacy, money, or transition change requires a new schema version and ADR. Unsupported versions must be rejected or quarantined.

## Consequences

The present chaincode and backend do not yet conform to all frozen rules. The mismatch inventory in `blockchainUpgrade.md` is the input to a separate runtime implementation. Approving this ADR does not claim that v1 event emission or stable errors are deployed.
