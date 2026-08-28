cd /mnt/z/Project/ReliefChain
docker network inspect reliefchain_fabric >/dev/null 2>&1 || docker network create reliefchain_fabric
docker compose -f fabric/network/compose.fabric.yaml up -d
docker compose up -d postgres api web caddy
docker compose ps
docker compose -f fabric/network/compose.fabric.yaml ps
curl -s http://localhost:4000/api/v1/health
curl -s http://localhost:4000/api/v1/health/ready
RELIEFCHAIN_URL=http://localhost:4000 node scripts/smoke-test.mjs

