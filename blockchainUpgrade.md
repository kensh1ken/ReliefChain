I completed a read-only review. No files were edited, no scripts were run, and the worktree remains unchanged.

The authoritative blockchain checklist is in [OTHER_TEAMS_WORK.md](Z:/Project/ReliefChain/OTHER_TEAMS_WORK.md:41). All 12 blockchain items are currently unchecked.

## Current position

Already implemented:

- Pure financial helpers for allocation, reservation, settlement, and reversal in [domain.ts](Z:/Project/ReliefChain/fabric/chaincode/src/domain.ts:1).
- Transaction-derived timestamps in [relief-contract.ts](Z:/Project/ReliefChain/fabric/chaincode/src/relief-contract.ts:8).
- Basic duplicate, ownership, and balance protection.
- Three Fabric organizations: Government, NGO, and Auditor.
- TLS-enabled peers and CAs in [compose.fabric.yaml](Z:/Project/ReliefChain/fabric/network/compose.fabric.yaml:1).
- Basic install/approve/commit automation in [deploy-chaincode.sh](Z:/Project/ReliefChain/scripts/deploy-chaincode.sh:1).

Important gaps:

- Chaincode has no `UNKNOWN` state, payout batches, proper linked-reversal asset, or versioned event envelope.
- Events are created by spreading assets, which is unsafe as models evolve.
- `GetHistory` is unbounded.
- Keys are strings such as `type:id`, not Fabric composite keys.
- Channel endorsement defaults to `ANY Endorsement`.
- CA containers exist, but identities are still generated through `cryptogen`.
- Only two basic domain tests exist.
- No committed-block replay or peer recovery testing exists.
- Images use version tags rather than immutable digests.

## Recommended implementation order

### 1. Freeze the ledger contract first

The existing proposed envelope is in [BACKEND_CONTRACTS.md](Z:/Project/ReliefChain/BACKEND_CONTRACTS.md:79).

Create a shared contract module, preferably:

- `packages/contracts/src/ledger-events.ts`
- `packages/contracts/src/ledger-transactions.ts`
- `packages/contracts/fixtures/ledger-events/*.json`
- `packages/contracts/fixtures/ledger-transactions/*.json`

Define every event with:

```ts
interface LedgerEventEnvelope<T> {
  schemaVersion: 1;
  eventType: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  transactionId: string;
  actorMsp: string;
  payload: T;
}
```

Create an explicit allowlist for each event. Never put these into events:

- Beneficiary reference or commitment.
- Name, phone, Aadhaar-like value or bank information.
- OTPs, certificates, keys or secrets.
- Raw provider errors.
- Internal notes.

Also freeze each chaincode method’s argument order and return shape. The backend currently passes untyped string arrays through [ledger.ts](Z:/Project/ReliefChain/apps/api/src/ledger.ts:11), so contract fixtures are essential.

Current calls that must remain synchronized include:

- `RegisterDisaster(id, name, stateCode)`
- `RegisterScheme(id, disasterId, name)`
- `CreateFundSource(id, disasterId, sourceType, name, amountPaise)`
- `AllocateFunds(id, sourceId, schemeId, districtCode, amountPaise)`
- `RegisterBeneficiaryCommitment(reference, districtCode, schemeId)`
- `InitiateDisbursement(...)`
- `FinalizeDisbursement(...)`
- `ReverseDisbursement(...)`

### 2. Upgrade the chaincode domain model

Edit [domain.ts](Z:/Project/ReliefChain/fabric/chaincode/src/domain.ts:1).

Add:

- `UNKNOWN` to `PayoutState`.
- `PayoutBatchAsset`.
- `DisbursementStatusTransition`.
- A separate `ReversalAsset`, linked through `reversalOf`.
- `batchId` on disbursements.
- Reconciliation metadata such as a privacy-safe provider-reference hash.
- Pure functions for all legal transitions.

Recommended state machine:

```text
PENDING -> SETTLED
PENDING -> FAILED
PENDING -> UNKNOWN
UNKNOWN -> SETTLED
UNKNOWN -> FAILED
SETTLED -> REVERSED
```

An `UNKNOWN` payout must retain its reserved allocation. Only reconciliation to `SETTLED` or `FAILED` should release that reservation.

For reversals, do not store the reason in `failureReason`. Use:

- `reversalId`
- `reversalOf`
- `reasonCode`
- `approvedByMsp`
- `createdAt`

Prefer reason codes on-chain and keep detailed investigation notes off-chain.

### 3. Update transaction handlers and events

Edit [relief-contract.ts](Z:/Project/ReliefChain/fabric/chaincode/src/relief-contract.ts:5).

Add or update transactions such as:

```text
CreatePayoutBatch
SubmitPayoutBatch
InitiateDisbursement
MarkDisbursementUnknown
ReconcileDisbursement
ReverseDisbursement
ReadAsset
QueryAssetsByType
```

Replace this unsafe event pattern:

```ts
{ ...asset, beneficiaryRef: undefined }
```

with explicit payload construction:

```ts
{
  publicReference: asset.publicReference,
  allocationId: asset.allocationId,
  batchId: asset.batchId,
  amountPaise: asset.amountPaise,
  fromStatus: 'PENDING',
  toStatus: 'SETTLED'
}
```

Every accepted state transition should emit one versioned event. Failed transactions should not emit an accepted-transition event.

The backend payout and reconciliation methods in [payouts.service.ts](Z:/Project/ReliefChain/apps/api/src/payouts.service.ts:21) must then be updated jointly so their transaction names and arguments match.

### 4. Make storage deterministic and queryable

In [relief-contract.ts](Z:/Project/ReliefChain/fabric/chaincode/src/relief-contract.ts:6):

- Replace `type:id` keys with `ctx.stub.createCompositeKey()`.
- Add composite indexes for entity type, owner MSP, status, batch, and public reference.
- Use transaction-context timestamps everywhere.
- Implement canonical JSON serialization with consistently sorted object keys.
- Reject unsafe integers and floating-point money.
- Add bounded paginated queries using Fabric pagination APIs.
- Replace or bound `GetHistory`; the current implementation reads the entire history.

Because existing MVP keys use `type:id`, maintain backward-compatible reads during migration:

1. Try the new composite key.
2. Fall back to the legacy key.
3. Provide an idempotent migration transaction.
4. Record the migrated schema version.
5. Test rerunning the migration.

### 5. Strengthen authorization and endorsement

The current `requireWriter()` falls back from certificate attributes to the MSP name. Replace this with strict validation of:

- Allowed MSP.
- `role` certificate attribute.
- `service` or identity-purpose attribute.
- Organization ownership.
- District/geography attribute where applicable.

Auditor identities should be read-only at chaincode level.

The channel currently uses `ANY Endorsement` in [configtx.yaml](Z:/Project/ReliefChain/fabric/network/configtx.yaml:36). Define the agreed baseline:

- Government source/allocation: Government endorsement.
- NGO source/allocation: NGO endorsement.
- Disbursement: owning organization.
- Settlement/failure: owning organization plus designated settlement policy.
- High-risk reversal: owning organization plus oversight approval.

Use Fabric state-based endorsement on the affected source, allocation, disbursement, or reversal key. The high-value threshold and approval model must be frozen before coding.

### 6. Replace cryptogen with Fabric CA identities

Although CA containers are defined, [fabric-up.sh](Z:/Project/ReliefChain/scripts/fabric-up.sh:7) still executes `cryptogen`.

Add CA configuration and lifecycle scripts, for example:

- `fabric/network/ca/`
- `scripts/ca-bootstrap.sh`
- `scripts/enroll-identities.sh`
- `scripts/renew-identity.sh`
- `scripts/revoke-identity.sh`
- `scripts/rotate-gateway.sh`

Create separate identities for:

- Organization administrators.
- Peers.
- Government API gateway.
- NGO API gateway.
- Read-only auditor gateway.
- Chaincode/lifecycle administration.
- Orderer nodes.

Enroll attributes such as `role`, `org`, `district`, and `service`. Persist CA state, remove bootstrap passwords from Compose, generate CRLs after revocation, and document overlapping certificate rotation.

Once CA startup is proven, retire `crypto-config.yaml` and the `cryptogen` path.

### 7. Add state-based endorsement for reversals

For a reversal:

1. Read and validate the settled disbursement.
2. Check organization ownership.
3. Validate an oversight or second-approval record.
4. Create the linked reversal asset.
5. update the original payout status.
6. Restore the allocation balance.
7. Apply the stricter validation parameter to the relevant keys.
8. Emit one privacy-safe `DisbursementReversed` event.

Tests must prove that one organization alone cannot perform a protected reversal.

### 8. Expand automated tests

Extend [domain.test.ts](Z:/Project/ReliefChain/fabric/chaincode/src/domain.test.ts:1) and add contract/integration suites.

Required unit coverage:

- Positive integer money only.
- Over-allocation and over-disbursement.
- Duplicate IDs, public references, and idempotency keys.
- Every allowed and prohibited transition.
- `UNKNOWN` reservation behavior.
- Batch transitions.
- Linked reversals and duplicate reversals.
- Deterministic serialization.
- Event payload allowlists and PII rejection.
- Legacy-to-new key migration.

Required Fabric integration coverage:

- Government cannot modify NGO assets and vice versa.
- Auditor cannot submit writes.
- Endorsement succeeds and fails with the expected organizations.
- Invalid transactions produce no accepted event.
- Events contain correct block, transaction, and schema information.
- Chaincode upgrade from sequence 1 to sequence 2 preserves existing state.

### 9. Define the committed-block replay contract

The blockchain team should supply the backend/indexer team with:

- Real committed-block fixtures.
- Event decoding rules.
- Event identity: block number + transaction ID + event index.
- Starting-block and checkpoint semantics.
- Invalid transaction handling.
- Duplicate delivery expectations.
- Schema-version compatibility behavior.
- Expected handling for malformed events and missing blocks.

The backend currently writes API-side receipts directly in [ledger.ts](Z:/Project/ReliefChain/apps/api/src/ledger.ts:56); it does not rebuild projections from peer block events. The future indexer should checkpoint only after a complete block is persisted and should be idempotent on replay.

### 10. Upgrade lifecycle automation

Improve [deploy-chaincode.sh](Z:/Project/ReliefChain/scripts/deploy-chaincode.sh:1):

- Accept version, sequence, package label, and endorsement policy as parameters.
- Calculate and verify the package ID.
- Run `checkcommitreadiness`.
- Confirm each required organization approved the same definition.
- Commit only after health and migration checks.
- Verify `querycommitted`.
- Run post-deployment smoke tests.
- Record package hash, version, sequence, and image digest.
- Support rollback through a tested compatible package/sequence procedure.

Do not hard-code every deployment as version `1.0`, sequence `1`.

### 11. Add recovery tests and runbooks

Add scripts and documentation for:

- Peer snapshot creation and restore.
- Rebuilding one peer from an empty volume.
- Rejoining the channel.
- Reinstalling the committed chaincode package.
- Replaying blocks from the backend checkpoint.
- Orderer/channel-configuration backup.
- CA backup and restore.
- Gateway certificate rotation.
- Revocation and CRL propagation.

The acceptance test is that rebuilding one peer does not change balances or cause projection discrepancies.

### 12. Pin dependencies immutably

Current images use tags such as `hyperledger/fabric-peer:2.5.12`, and chaincode dependencies use caret ranges in [package.json](Z:/Project/ReliefChain/fabric/chaincode/package.json:10).

Change these to:

- Docker images pinned by digest: `image: repository:version@sha256:...`
- Exact npm dependency versions without `^`.
- A committed lockfile.
- Recorded checksums/package IDs for the chaincode package.
- Automated dependency, image, license, and vulnerability checks.

## Verification sequence

After implementing each layer, use:

```powershell
npm run typecheck -w @reliefchain/chaincode
npm test -w @reliefchain/chaincode
npm run build -w @reliefchain/chaincode
npm test -w @reliefchain/contracts
```

Then on a Docker/Bash-capable machine:

```bash
bash scripts/fabric-up.sh
bash scripts/deploy-chaincode.sh
node scripts/smoke-test.mjs
```

Finally, run the full multi-organization test suite, event replay from an empty projection database, peer rebuild, certificate rotation, and chaincode upgrade tests.

The safest milestone order is: contract freeze → chaincode domain/events → authorization/endorsement → CA identities → integration/replay → recovery/lifecycle hardening.