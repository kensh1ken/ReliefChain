# Security and privacy boundaries

ReliefChain is a hackathon demonstration using synthetic identities and simulated money. It is not authorized to query UIDAI, send bank payouts, or process real personal data.

## Data placement

| Data | Fabric | PostgreSQL | Public API |
|---|---:|---:|---:|
| HMAC beneficiary reference | Yes | Yes | No |
| Synthetic Aadhaar | No | No | No |
| Encrypted name and phone | No | Yes | No |
| District, scheme, amount, status | Yes | Indexed | Aggregate/proof only |
| OTP hash and expiry | No | Temporary | No |
| Fabric transaction proof | Yes | Indexed | Yes |

The beneficiary reference uses HMAC-SHA-256 with a secret held outside the database. Contact fields use AES-256-GCM. Operator passwords and OTP challenges use Argon2; refresh tokens are stored only as SHA-256 hashes. Access tokens are short-lived and revoked JWT IDs are checked against PostgreSQL. Public district aggregates require at least three distinct beneficiaries per district/scheme/source group.

## MVP limitations

- The single-VM Fabric topology is not highly available.
- Demo identities are bootstrapped with `cryptogen`; the running Fabric CAs are provided for a later enrollment migration.
- The mock OTP is intentionally documented for judging and must never be used outside synthetic demo data.
- The database projection is rebuildable metadata, but the MVP indexer records receipts submitted through this API rather than replaying every peer block after an extended outage.
- Before a pilot, add a secrets manager, CA enrollment/rotation, real block-event replay, infrastructure backups, penetration testing, consent and retention policy, and authorized identity/payment providers.
- Current backend controls include PostgreSQL-shared endpoint rate limits, production rejection of mock OTP configuration, bounded token lifetimes, versioned encryption/HMAC key rings, authorization helpers, and sensitive-field redaction for stored ledger projections. Refresh-session integration tests, real notification delivery, and structured log/trace redaction remain required before a pilot.
