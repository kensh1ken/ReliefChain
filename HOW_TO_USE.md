# ReliefChain Fabric Mode Runbook

This guide operates the complete ReliefChain hackathon MVP in **Fabric mode**: Hyperledger Fabric, the `relief-funds` chaincode, PostgreSQL, the NestJS API, the Next.js web application, and the Flutter beneficiary application.

All local identities, beneficiaries, balances, and payouts must be synthetic. This topology is for development and demonstration, not production.

## 1. Local services

| Component | Name | Purpose |
|---|---|---|
| PostgreSQL | `reliefchain-postgres-1` | API data, projections, jobs, and sessions |
| NestJS API | `reliefchain-api-1` | REST API, Fabric gateway, worker, and indexer |
| Next.js web | Local process or `reliefchain-web-1` | Public dashboard and staff/auditor interface |
| Caddy | `reliefchain-caddy-1` | Routes `/api/*` to the API and other requests to the web container |
| Orderer | `orderer.example.com` | Orders transactions for `reliefchannel` |
| Government peer | `peer0.government.example.com` | GovernmentMSP endorsement and ledger copy |
| NGO peer | `peer0.ngo.example.com` | NgoMSP endorsement and ledger copy |
| Auditor peer | `peer0.auditor.example.com` | AuditorMSP ledger copy |
| Chaincode | `relief-funds` | Fund and disbursement ledger rules |
| Flutter app | Android emulator or physical device | Beneficiary OTP and payout-status experience |

Both Compose stacks use the external Docker network `reliefchain_fabric`. The API reaches peers through Docker DNS names such as `peer0.government.example.com:7051`.

## 2. Required environment

Run Bash scripts from the **Ubuntu WSL 2 terminal**, not PowerShell, Command Prompt, or Git Bash.

From Windows PowerShell, verify WSL:

```powershell
wsl --list --verbose
```

Ubuntu must show `VERSION 2`. To convert version 1:

```powershell
wsl --shutdown
wsl --set-version Ubuntu 2
wsl --set-default-version 2
```

Use the exact distribution name reported by `wsl --list --verbose` if it is not `Ubuntu`.

Inside Ubuntu:

```bash
cd /mnt/z/Project/ReliefChain
uname -m
docker info --format 'Docker={{.OSType}}/{{.Architecture}}'
which node
which npm
node --version
npm --version
```

Expected architecture is `x86_64` and Docker is `linux/x86_64`. Node and npm must resolve under `/usr/bin` or `~/.nvm`, not `/mnt/c/Program Files/nodejs`.

Docker Desktop must be running with the WSL 2 engine, Linux containers, and Ubuntu WSL integration enabled.

For the beneficiary app, install Flutter and Android Studio on Windows. Confirm the Android SDK, emulator, and licenses before attempting to run it:

```powershell
flutter doctor
flutter doctor --android-licenses
flutter devices
```

## 3. Configure `.env`

Create it once:

```bash
cp .env.example .env
```

Use Fabric mode:

```dotenv
LEDGER_MODE=fabric
FABRIC_CHANNEL=reliefchannel
FABRIC_CHAINCODE=relief-funds
AUTO_SEED=true
WORKER_ENABLED=true
```

Replace all secret placeholders. Generate development values inside Ubuntu:

```bash
openssl rand -base64 32
openssl rand -hex 32
openssl rand -hex 32
```

Use the Base64 value for `PII_ENCRYPTION_KEY`, and separate hexadecimal values for `JWT_SECRET` and `BENEFICIARY_HMAC_SECRET`. Do not commit `.env`. The PII key must decode to exactly 32 bytes.

After the first successful seed, seed recovery can recognize matching ledger assets. For simpler daily startup, set `AUTO_SEED=false` after PostgreSQL and Fabric contain the demo data. Turn it back on only when restoring seed data intentionally.

## 4. First-time Fabric initialization [DO NOT DO THIS AGAIN ,YOU HAVE TO DO THIS ONE TIME ONLY]

Use this only when generated organizations and the channel do not exist, or after an intentional complete reset:

```bash
cd /mnt/z/Project/ReliefChain
npm install
bash scripts/fabric-up.sh
```

The script creates the Docker network, generates development identities, creates `reliefchannel`, starts the orderer and peers, joins them to the channel, and generates API gateway credentials.

Do **not** use `fabric-up.sh` as the everyday restart command. It regenerates cryptographic material. Combining new certificates with old Fabric volumes can cause `certificate signed by unknown authority` and missing-channel errors.

Verify the services:

```bash
docker compose -f fabric/network/compose.fabric.yaml ps
docker network inspect reliefchain_fabric >/dev/null && echo 'Fabric network exists'
```

## 5. Deploy and verify chaincode

For a new channel with no committed definition:

```bash
CHAINCODE_VERSION=1.0 CHAINCODE_SEQUENCE=1 bash scripts/deploy-chaincode.sh
```

The script builds, packages, and installs the chaincode on all peers, obtains organization approvals, and commits it to `reliefchannel`.

Verify the committed definition:

```bash
docker run --rm \
  --network reliefchain_fabric \
  -v "$PWD:/workspace" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=GovernmentMSP \
  -e CORE_PEER_ADDRESS=peer0.government.example.com:7051 \
  -e CORE_PEER_MSPCONFIGPATH=/workspace/fabric/network/organizations/peerOrganizations/government.example.com/users/Admin@government.example.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/workspace/fabric/network/organizations/peerOrganizations/government.example.com/peers/peer0.government.example.com/tls/ca.crt \
  hyperledger/fabric-tools:2.5.16 \
  peer lifecycle chaincode querycommitted \
  --channelID reliefchannel \
  --name relief-funds
```

Expected output includes version `1.0` and sequence `1` for a fresh deployment.

Only use a new sequence for a real chaincode upgrade after the previous sequence is committed:

```bash
CHAINCODE_VERSION=1.1 CHAINCODE_SEQUENCE=2 bash scripts/deploy-chaincode.sh
```

Do not increase the sequence merely because installation reports that a package already exists. Installation and the committed lifecycle definition are separate.

## 6. Normal daily startup

When Fabric has already been initialized, preserve its identities and volumes:

```bash
cd /mnt/z/Project/ReliefChain
docker network inspect reliefchain_fabric >/dev/null 2>&1 || docker network create reliefchain_fabric
docker compose -f fabric/network/compose.fabric.yaml up -d
docker compose -f fabric/network/compose.fabric.yaml ps
```

Then start PostgreSQL and the API:

```bash
docker compose up --build -d postgres api
docker compose ps
docker compose logs --tail=100 api
```

Omit `--build` if the API image is current:

```bash
docker compose up -d postgres api
```

Do not run `npm run demo:api`; it is a separate in-memory service and competes for port 4000.

## 7. Verify the running backend

Check all containers:

```bash
docker compose ps
docker compose -f fabric/network/compose.fabric.yaml ps
```

Check health and readiness:

```bash
curl -s http://localhost:4000/api/v1/health
curl -s http://localhost:4000/api/v1/health/ready
```

PowerShell equivalents:

```powershell
Invoke-RestMethod http://localhost:4000/api/v1/health
Invoke-RestMethod http://localhost:4000/api/v1/health/ready
```

Readiness is the stronger check: the database, ledger connection, worker, and indexer should be `ready` or explicitly `not_configured` where applicable.

If the host endpoint fails, test from inside the API container:

```bash
docker compose exec api node -e "fetch('http://localhost:4000/api/v1/health').then(async r => console.log(r.status, await r.text()))"
docker compose port api 4000
```

The published port should resemble `0.0.0.0:4000`.

Run the smoke test:

```bash
RELIEFCHAIN_URL=http://localhost:4000 node scripts/smoke-test.mjs
```

Expected output:

```text
PASS /api/v1/health
PASS /api/v1/public/summary
PASS /api/v1/public/districts
```

Swagger API documentation is available at:

```text
http://localhost:4000/api/v1/docs
```

Demo staff accounts:

| Role | Email | Password |
|---|---|---|
| Government | `gov@reliefchain.demo` | `Relief@123` |
| NGO | `ngo@reliefchain.demo` | `Relief@123` |
| Auditor | `auditor@reliefchain.demo` | `Relief@123` |

## 8. Start the Next.js web application

The API must be healthy before starting the web application. Choose either local development or Docker; do not run both unless you intentionally want two web instances.

### Option A: local Next.js development server

This option gives fast refresh and is recommended while developing. From Ubuntu in a separate terminal:

```bash
cd /mnt/z/Project/ReliefChain
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 npm run dev:web
```

Open:

```text
http://localhost:3000
```

Keep this terminal running. Stop only the web development server with `Ctrl+C`; the Docker API and Fabric network continue running.

If port 3000 is occupied, find the old process before starting another instance:

```bash
ss -ltnp | grep ':3000'
```

### Option B: Dockerized web and Caddy

This option runs the full browser-facing stack in Docker:

```bash
cd /mnt/z/Project/ReliefChain
docker compose up --build -d postgres api web caddy
docker compose ps
docker compose logs --tail=100 web caddy
```

Open `https://localhost`. `http://localhost` may redirect to HTTPS. Because this is a local Caddy certificate, the browser may require local certificate trust or display a development warning.

The web image uses `/api/v1`; Caddy forwards `/api/*` to the API container. The API remains directly testable at `http://localhost:4000/api/v1/health`.

Verify the web proxy:

```bash
curl -k https://localhost/api/v1/health
```

### Verify the web build

```bash
npm run typecheck -w @reliefchain/web
npm run build -w @reliefchain/web
```

Use the public dashboard without signing in, or sign in with one of the staff accounts in section 7.

## 9. Start the Flutter beneficiary app

Run Flutter from Windows PowerShell when Android Studio and the Android SDK are installed on Windows. Keep Docker Desktop, Fabric, PostgreSQL, and the API running.

### Prepare Flutter

```powershell
Set-Location Z:\Project\ReliefChain\mobile
flutter doctor
flutter devices
flutter pub get
flutter gen-l10n
dart run build_runner build --delete-conflicting-outputs
```

The Android project wrapper already exists under `mobile/android`; do not run `flutter create` during normal setup.

### Android emulator

Start an Android emulator from Android Studio, confirm it appears in `flutter devices`, then run:

```powershell
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is the Android emulator route to the Windows host. Do not use `localhost` from an Android emulator; that refers to the emulator itself.

### Physical Android device

Connect the phone and development machine to the same local network. Find the Windows IPv4 address:

```powershell
ipconfig
```

Then replace `192.168.1.25` with that address:

```powershell
flutter run --dart-define=API_URL=http://192.168.1.25:4000/api/v1
```

Port 4000 must be allowed through Windows Firewall for the private network. Confirm the phone can open this URL in its browser before starting Flutter:

```text
http://192.168.1.25:4000/api/v1/health
```

### Beneficiary demo login

The `.env` values control the synthetic phone and OTP:

```dotenv
DEMO_BENEFICIARY_PHONE=+919876543210
MOCK_OTP=123456
```

If these values are changed, recreate the API so Compose reloads the environment:

```bash
docker compose up -d --force-recreate api
```

Use the configured synthetic phone and OTP in the Flutter application. No real SMS, Aadhaar, bank, or payment-provider integration is used.

### Test and build Flutter

From `Z:\Project\ReliefChain\mobile` in PowerShell:

```powershell
flutter analyze
flutter test
```

Build an emulator/development APK:

```powershell
flutter build apk --debug --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

For a release APK, pass the deployed HTTPS API URL:

```powershell
flutter build apk --release --dart-define=API_URL=https://your-domain.example/api/v1
```

APK output is written under `mobile\build\app\outputs\flutter-apk\`. Before distributing a network-enabled release APK, ensure the production Android manifest, TLS configuration, signing, and backend URL are configured; debug-mode connectivity alone is not a production configuration.

## 10. Inspect PostgreSQL

Open the SQL shell:

```bash
docker compose exec postgres psql -U reliefchain -d reliefchain
```

Useful read-only checks:

```sql
\dt
SELECT id, applied_at FROM schema_migrations ORDER BY applied_at;
SELECT id, public_reference, status, amount_paise, proof FROM disbursements ORDER BY created_at DESC LIMIT 10;
SELECT status, COUNT(*) FROM payout_jobs GROUP BY status ORDER BY status;
SELECT event_name, entity_id, transaction_id, block_number, committed_at FROM ledger_events ORDER BY committed_at DESC LIMIT 20;
```

Use `\q` to exit. If a table or column has changed during development, inspect the current schema with `\dt` and `\d table_name` first.

## 11. Automated tests

These commands validate code. They do **not** start PostgreSQL, the API, or Fabric containers.

```bash
npm run typecheck -w @reliefchain/contracts
npm test -w @reliefchain/contracts
npm run build -w @reliefchain/contracts

npm run typecheck -w @reliefchain/chaincode
npm test -w @reliefchain/chaincode
npm run build -w @reliefchain/chaincode

npm run typecheck -w @reliefchain/api
npm test -w @reliefchain/api
npm run build -w @reliefchain/api
```

Run every workspace when needed:

```bash
npm run typecheck
npm test
npm run build
```

Success means each command exits with code `0`. Unit tests prove code behavior; health, readiness, smoke, and lifecycle checks prove the running integration.

## 12. Logs and common diagnostics

Follow API logs:

```bash
docker compose logs -f --tail=100 api
```

Press `Ctrl+C` to stop following logs; this does not stop the container.

Follow Fabric logs:

```bash
docker logs -f --tail=100 peer0.government.example.com
docker logs -f --tail=100 peer0.ngo.example.com
docker logs -f --tail=100 peer0.auditor.example.com
docker logs -f --tail=100 orderer.example.com
```

Inspect containers and networks:

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Networks}}'
docker network ls
docker network inspect reliefchain_fabric
```

Inspect non-secret API ledger settings:

```bash
docker compose exec api node -e "console.log({ledgerMode:process.env.LEDGER_MODE,channel:process.env.FABRIC_CHANNEL,chaincode:process.env.FABRIC_CHAINCODE,peer:process.env.FABRIC_GOVERNMENT_GATEWAY_PEER})"
```

Check peer DNS from the API:

```bash
docker compose exec api node -e "require('dns').lookup('peer0.government.example.com',(e,a)=>console.log(e||a))"
```

## 13. Safe shutdown and restart

Stop a locally running Next.js or Flutter development process with `Ctrl+C` in its own terminal before stopping Docker.

Stop the Dockerized application services while preserving data:

```bash
docker compose stop caddy web api postgres
```

Restart them:

```bash
docker compose start postgres api web caddy
```

Stop both stacks while preserving named volumes:

```bash
docker compose down
docker compose -f fabric/network/compose.fabric.yaml down
```

Start Fabric first during the next session, followed by PostgreSQL, the API, and the selected frontend mode.

To stop Docker Desktop itself, first stop both Compose stacks. Quit Docker Desktop from Windows. If WSL must also stop, run in PowerShell:

```powershell
wsl --shutdown
```

Normally stop Compose stacks instead of repeatedly resetting the Docker engine.

## 14. Complete destructive reset

Use this only when all local PostgreSQL and ledger data may be deleted—for example, when generated certificates no longer match persisted Fabric volumes.

Verify the location first:

```bash
pwd
```

It must be `/mnt/z/Project/ReliefChain`. Then:

```bash
docker compose down -v --remove-orphans
docker compose -f fabric/network/compose.fabric.yaml down -v --remove-orphans
rm -rf /mnt/z/Project/ReliefChain/fabric/network/organizations
rm -rf /mnt/z/Project/ReliefChain/fabric/network/channel-artifacts
rm -rf /mnt/z/Project/ReliefChain/fabric/network/credentials
```

Initialize again:

```bash
cd /mnt/z/Project/ReliefChain
bash scripts/fabric-up.sh
CHAINCODE_VERSION=1.0 CHAINCODE_SEQUENCE=1 bash scripts/deploy-chaincode.sh
docker compose up --build -d postgres api web caddy
docker compose logs -f --tail=100 api
```

This reset is irreversible for local Docker data. Never use it on shared or production infrastructure.

## 15. Common failures

### WSL or Node installation error

For `WSL 1 is not supported` or `Could not determine Node.js install directory`, confirm Ubuntu is WSL 2 and `which node`/`which npm` do not resolve under `/mnt/c/`. Use native Linux Node.js and run scripts from Ubuntu.

### Peer name resolution failure

For `Name resolution failed for peer0.government.example.com`, ensure Fabric is running and both stacks use `reliefchain_fabric`:

```bash
docker network inspect reliefchain_fabric
docker compose -f fabric/network/compose.fabric.yaml up -d
docker compose up -d api
```

### API has no published port

For `no port 4000/tcp for container`, recreate the API from the root Compose file:

```bash
docker compose up --build -d api
docker compose port api 4000
```

### Seed asset already exists

For `[LEDGER_DUPLICATE]`, use the current API build, which supports matching seed recovery. If the system is already seeded, set `AUTO_SEED=false` and recreate only the API. Do not delete Fabric merely to bypass a duplicate.

### Insufficient chaincode installations

For `required chaincodes are not installed on sufficient peers`, confirm all organizations approved the same package, version, and sequence. Rerun `deploy-chaincode.sh` with the correct lifecycle values; it skips an identical installed package.

### Package already installed

`chaincode already successfully installed` does not prove the definition is committed. Query the committed definition using section 5. Do not increment the sequence just to avoid this message.

### Certificate authority mismatch

For `certificate signed by unknown authority` during channel join, the generated identities and persisted volumes do not match. Restore the matching material, or use section 14 only if all local data is disposable.

### Docker registry or DNS failure

This is a Docker connectivity, DNS, or proxy problem—not a chaincode error. Test the engine first:

```bash
docker run --rm --platform linux/amd64 alpine uname -m
```

### Web reports `Failed to fetch`

Confirm API health first. A local Next.js process must use `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`; the Dockerized web build uses `/api/v1` through Caddy. Rebuild the web image after changing a `NEXT_PUBLIC_*` build value.

### Android emulator cannot reach the API

Restart Flutter with `--dart-define=API_URL=http://10.0.2.2:4000/api/v1`. Confirm the API is published on port 4000 with `docker compose port api 4000`. A physical phone must use the development machine's LAN address instead.

## 16. Most-used daily commands

For an initialized project:

```bash
cd /mnt/z/Project/ReliefChain
docker network inspect reliefchain_fabric >/dev/null 2>&1 || docker network create reliefchain_fabric
docker compose -f fabric/network/compose.fabric.yaml up -d
docker compose up -d postgres api web caddy
docker compose ps
docker compose -f fabric/network/compose.fabric.yaml ps
curl -s http://localhost:4000/api/v1/health
curl -s http://localhost:4000/api/v1/health/ready
RELIEFCHAIN_URL=http://localhost:4000 node scripts/smoke-test.mjs
```

Open the Dockerized web application at `https://localhost`. To use the local development web server instead, omit `web caddy` from the Compose command and run this in a second Ubuntu terminal:

```bash
cd /mnt/z/Project/ReliefChain
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 npm run dev:web
```

To start the Flutter app on an Android emulator, run this separately from Windows PowerShell:

```powershell
Set-Location Z:\Project\ReliefChain\mobile
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

At the end of the session:

```bash
docker compose down
docker compose -f fabric/network/compose.fabric.yaml down
```

These daily commands preserve PostgreSQL data, ledger data, the channel, the committed chaincode definition, and generated development identities.
