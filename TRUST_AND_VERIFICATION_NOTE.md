# ReliefChain: From Institutional Trust to Verifiable Relief Evidence

## The problem

Disaster-relief money frequently passes through several institutions before it reaches a family. Even when every participant acts honestly, fragmented accounts, paper records, and delayed reconciliation make it difficult to answer basic questions:

- How much money entered a relief program?
- Who allocated it, to which district and scheme, and when?
- Was an eligible beneficiary's payout initiated, settled, failed, or reversed?
- Can a beneficiary verify a payment without publicly revealing their identity?
- Can an auditor reconstruct the same trail without depending on one department's database export?

The trust problem is created when the organization making a claim is also the only organization able to verify that claim. ReliefChain changes the evidence model: accepted financial transitions are recorded on a permissioned, tamper-evident ledger and are exposed through privacy-specific views for the public, beneficiaries, operators, and auditors.

## Solution thesis

ReliefChain does not ask users to trust a dashboard operator's statement that money was delivered. It produces a chain of evidence that can be checked against Hyperledger Fabric:

```text
Fund source
  -> district/scheme allocation
  -> privacy-preserving beneficiary commitment
  -> payout initiation and reserved balance
  -> settlement, failure, reconciliation, or reversal
  -> public proof and auditor history
```

Each accepted ledger operation has a transaction ID, submitting organization, Fabric timestamp, strict state transition, and versioned privacy-safe event. A later PostgreSQL edit cannot rewrite the Fabric block history. If the dashboard, operational database, and ledger disagree, the mismatch becomes detectable instead of silently replacing the historical record.

## How the implementation addresses the requirements

| Required capability | ReliefChain implementation | MVP status |
|---|---|---|
| Permissioned blockchain | Hyperledger Fabric channel with Government, NGO, and Auditor organizations; `relief-funds` chaincode records eight frozen v1 operations | Implemented locally on a single Docker host |
| Trace funds end to end | Sources, allocations, beneficiary commitments, disbursements, finalization, and reversals use deterministic ledger transitions and integer paise | Implemented |
| Privacy-preserving beneficiary linkage | Synthetic 12-digit identifier becomes an HMAC-SHA-256 reference; raw input is not persisted on-chain; name/phone are encrypted in PostgreSQL | Implemented with synthetic data; no UIDAI integration |
| Public transparency | Public summary, district/scheme aggregation, and proof lookup by opaque `RC-YYYY-XXXXXXXX` reference | Implemented in API; frontend consumes these routes |
| Beneficiary verification | OTP authentication returns a beneficiary-scoped JWT and exposes only that beneficiary's payment history | Implemented with mock OTP; Flutter client exists but is not configured in the current backend work |
| Auditor oversight | Read-only event, reconciliation, timeline, exception, annotation, and export workflows backed by committed-event indexing | Implemented in backend |
| Privacy-safe audit trail | Strict event payload allowlists and recursive denylisting prevent identity, OTP, raw provider, and secret fields from entering public events | Implemented and contract-tested |

## Why Hyperledger Fabric is appropriate

A public blockchain would unnecessarily expose relief metadata and make institutional identity and governance harder. Fabric is permissioned: participating organizations have certificate-backed identities, channel policies, peers, and explicit chaincode rules. This gives the project:

- attributable writes through the submitting MSP;
- deterministic enforcement of ownership, balances, amounts, and transitions;
- immutable transaction ordering and queryable asset history;
- private-network governance suitable for government and NGO participants;
- privacy-safe events that can feed public and audit projections.

The hackathon topology places all organizations on one host for ease of demonstration. A production design must place peers and keys under independent institutional control and require appropriate multi-organization endorsement for high-risk operations.

## Privacy is part of verification

Transparency does not mean publishing beneficiary identity. ReliefChain divides data deliberately:

| Data class | Storage and audience |
|---|---|
| Raw synthetic identity input | Used transiently to derive an HMAC reference; never included in public proof or Fabric events |
| Beneficiary name and phone | AES-256-GCM encrypted in PostgreSQL; available only through authorized beneficiary/operator workflows |
| Phone lookup | SHA-256 hash in PostgreSQL |
| Beneficiary ledger linkage | Pseudonymous HMAC commitment used by chaincode; excluded from return views and event payloads |
| Public financial evidence | District, scheme, source type, integer paise, status, public reference, transaction ID, and timestamps |
| Provider and investigation details | Kept off-chain; Fabric receives only a provider-reference hash and stable reason codes where allowed |

An HMAC reference is preferable to publishing a plain Aadhaar hash because a keyed transformation is harder to reverse through enumeration. Its security still depends on protecting and rotating the HMAC secret.

## Evidence available to each participant

### Beneficiary

After OTP verification, a beneficiary can see the promised amount and their own payout history. The public reference and ledger proof allow the status to be discussed or checked without exposing Aadhaar-like data or a phone number.

### Public

Anyone can inspect aggregate received, allocated, pending, settled, failed, and remaining amounts by district and scheme. Small groups are suppressed to reduce re-identification risk. A public reference can be checked without revealing the recipient.

### Government and NGO operators

Operators can create and manage only organization-owned sources, allocations, and eligible payouts. Chaincode independently rejects duplicates, invalid amounts, ownership violations, insufficient balances, and illegal transitions.

### Auditors and CAG-style oversight

Auditors receive read-only access to committed events, reconciliation totals, entity timelines, exceptions, and exportable evidence. They can compare PostgreSQL projections with Fabric `ReadAsset` and `GetHistory` results instead of accepting a paper statement from the operating department.

## What the ledger proves—and what it does not

The MVP can prove that:

- a certificate-backed organization submitted an accepted transaction;
- the chaincode validated the transaction under its recorded rules;
- the transaction was ordered and committed at a specific point in ledger history;
- later ordinary application/database edits cannot silently rewrite that committed history;
- the public event contains only the approved privacy-safe schema;
- balances and payout states follow the encoded transition rules.

The MVP does not yet prove that:

- UIDAI verified a real Aadhaar holder;
- a bank or payment network moved real money;
- the original field data supplied by an operator was truthful;
- peers are independently operated, because the hackathon network is single-host;
- production key custody, availability, disaster recovery, and regulatory controls are complete.

These limitations matter. Blockchain secures the integrity and attribution of recorded evidence; it cannot guarantee the truth of an external fact that was never independently attested. A production rollout should integrate regulated identity and payment providers, independent peers, stronger endorsement policies, hardware-backed keys, certificate lifecycle management, and operational audits.

## Demonstrable evidence in the MVP

The trust claim can be demonstrated rather than narrated:

1. Submit or use a seeded payout through the API.
2. Retrieve its privacy-safe public proof by reference.
3. Retrieve the same asset directly with Fabric `ReadAsset`.
4. Retrieve its transitions with Fabric `GetHistory`.
5. Confirm the transaction in the auditor event API and PostgreSQL committed-event index.
6. Run the event privacy query and verify that prohibited identity fields return zero matches.
7. Attempt a duplicate, over-allocation, cross-organization write, or illegal state transition and observe deterministic rejection.

Health and readiness establish that the API, PostgreSQL, Fabric gateway, worker, and committed-event indexer are connected. Contract, backend, and chaincode suites verify schemas, privacy rules, balance invariants, authorization, retry behavior, and legal transitions.

## Conclusion

ReliefChain replaces a single unverifiable institutional assertion with a shared evidence trail. Beneficiaries gain a private way to check their own payout, the public gains safe aggregate visibility, and auditors gain a machine-readable history that can be compared directly with the ledger. The MVP demonstrates the technical pattern credibly while keeping real identity, banking, multi-host governance, and production hardening as explicit next steps.

For the component topology and deployment boundaries, see [ARCHITECTURE.md](ARCHITECTURE.md). For exact ledger interfaces, see [BACKEND_CONTRACTS.md](BACKEND_CONTRACTS.md). For runtime behavior, see [BACKEND_WORKFLOW.md](BACKEND_WORKFLOW.md).
