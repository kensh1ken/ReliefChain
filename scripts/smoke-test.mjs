const base = process.env.RELIEFCHAIN_URL ?? 'http://localhost';
const checks = [
  ['/api/v1/health', (data) => data.status === 'ok'],
  ['/api/v1/public/summary', (data) => data.source === 'FABRIC_INDEX' && Number.isFinite(data.received_paise)],
  ['/api/v1/public/districts', Array.isArray]
];
let failed = false;
for (const [path, validate] of checks) {
  try {
    const response = await fetch(`${base}${path}`); const data = await response.json();
    if (!response.ok || !validate(data)) throw new Error(`unexpected response ${response.status}`);
    console.log(`PASS ${path}`);
  } catch (error) { failed = true; console.error(`FAIL ${path}: ${error.message}`); }
}
if (failed) process.exit(1);
