# How to Use and Operate ReliefChain

This guide provides the fastest way to run and demonstrate ReliefChain locally. All identities, funds, and payouts are synthetic.

## 1. Start the local demo

The web application and API must both be running. A browser-only launch causes `Failed to fetch` during login because there is no service listening on port 4000.

For the real NestJS backend, see [BACKEND_WORKFLOW.md](BACKEND_WORKFLOW.md) for the current API, authentication, persistence, and payout flows. The lightweight `demo:api` remains a separate in-memory service.

Open two PowerShell terminals in the project directory.

Terminal 1 — start the local demo API:

```powershell
npm run demo:api
```

Wait for:

```text
ReliefChain demo API ready at http://localhost:4000/api/v1
```

Terminal 2 — start the web application:

```powershell
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000). Confirm the API is available at [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health).

## 2. Login credentials

All three institutional accounts use the password `Relief@123`.

| Role | Email | Starting page |
|---|---|---|
| Government operator | `gov@reliefchain.demo` | Fund operations |
| NGO operator | `ngo@reliefchain.demo` | NGO-owned fund operations |
| Auditor | `auditor@reliefchain.demo` | Ledger reconciliation |

The local demo API stores changes in memory. Restarting it restores the original Assam flood dataset.

## 3. Public dashboard

No login is required.

1. Review total funds received, allocated, paid, and remaining.
2. Compare the Kamrup and Barpeta district distributions.
3. In **Verify a disbursement**, enter `RC-2026-DEMO0001`.
4. Confirm that the proof displays status, amount, scheme, district, transaction ID, and commit time without beneficiary identity.

## 4. Government or NGO operations

Sign in with the appropriate operator account. The organization boundary is enforced: government users see government-owned sources and NGOs see NGO-owned sources.

Available transaction tabs:

- **Fund:** Register a new government or NGO fund source.
- **Allocation:** Assign part of an owned fund to a district and scheme.
- **Beneficiary:** Create a commitment using synthetic details only.
- **Payout:** Select an eligible allocation and beneficiary, enter an amount, and choose a simulated success or failure.

After submitting a payout, wait approximately two seconds and refresh the operator or public dashboard to see its final state.

## 5. Auditor workflow

1. Sign in as `auditor@reliefchain.demo`.
2. Review each fund source’s received, allocated, settled, pending, and remaining balance.
3. Inspect the immutable event stream and transaction identifiers.
4. Select **Export signed trail** to download the reconciliation CSV.
5. Use **API documentation** only with the full NestJS/PostgreSQL deployment; the lightweight demo API does not host Swagger.

## 6. Beneficiary mobile workflow

The Flutter client connects to the same API. Set `MOCK_OTP` and a synthetic `DEMO_BENEFICIARY_PHONE` before starting the demo API, then build or run Flutter with the appropriate API URL.

```powershell
$env:MOCK_OTP="your-six-digit-demo-code"
$env:DEMO_BENEFICIARY_PHONE="your-synthetic-indian-number"
npm run demo:api
```

On an Android emulator, the default API address is `http://10.0.2.2:4000/api/v1`. For a physical device, use the computer’s LAN address and ensure port 4000 is accessible.

## 7. Troubleshooting

### Login shows `Failed to fetch`

- Start `npm run demo:api` in a separate terminal.
- Open the health endpoint and confirm it returns `{"status":"ok"...}`.
- Keep both terminal processes running.
- Check that another program is not using port 4000.

### Login shows `Invalid credentials`

- Use the exact lowercase demo email and password shown above.
- Clear the browser’s local storage or open a private window if an old token is cached.

### Dashboard opens but contains no amounts

The web server is running but the API is unavailable. Start or restart `npm run demo:api`, then refresh the page.

### Port 3000 is already occupied

Stop the older Next.js process with `Ctrl+C`, then run `npm run dev:web` again.

## 8. Full Docker and Fabric operation

The zero-Docker demo API is for UI evaluation and uses explicitly simulated transaction proofs. For PostgreSQL and the real Hyperledger Fabric network, follow the **Real Fabric demo** and **Cloud VM deployment** sections in the main [README](README.md).
