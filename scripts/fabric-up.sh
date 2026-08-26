#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NET="$ROOT/fabric/network"
docker network inspect reliefchain_fabric >/dev/null 2>&1 || docker network create reliefchain_fabric
mkdir -p "$NET/organizations" "$NET/channel-artifacts" "$NET/credentials/government" "$NET/credentials/ngo"
docker run --rm -v "$NET:/workspace" -w /workspace hyperledger/fabric-tools:2.5.16 cryptogen generate --config=crypto-config.yaml --output=organizations
docker run --rm -v "$NET:/workspace" -w /workspace -e FABRIC_CFG_PATH=/workspace hyperledger/fabric-tools:2.5.16 configtxgen -profile ReliefApplicationChannel -channelID reliefchannel -outputBlock channel-artifacts/reliefchannel.block
cp "$NET/organizations/peerOrganizations/government.example.com/users/User1@government.example.com/msp/signcerts/"* "$NET/credentials/government/cert.pem"
cp "$NET/organizations/peerOrganizations/government.example.com/users/User1@government.example.com/msp/keystore/"* "$NET/credentials/government/key.pem"
cp "$NET/organizations/peerOrganizations/government.example.com/peers/peer0.government.example.com/tls/ca.crt" "$NET/credentials/government/tls-ca.pem"
cp "$NET/organizations/peerOrganizations/ngo.example.com/users/User1@ngo.example.com/msp/signcerts/"* "$NET/credentials/ngo/cert.pem"
cp "$NET/organizations/peerOrganizations/ngo.example.com/users/User1@ngo.example.com/msp/keystore/"* "$NET/credentials/ngo/key.pem"
cp "$NET/organizations/peerOrganizations/ngo.example.com/peers/peer0.ngo.example.com/tls/ca.crt" "$NET/credentials/ngo/tls-ca.pem"
docker compose -f "$NET/compose.fabric.yaml" up -d
sleep 5
ORDERER_TLS="$NET/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls"
docker run --rm --network reliefchain_fabric -v "$NET:/workspace" hyperledger/fabric-tools:2.5.16 osnadmin channel join --channelID reliefchannel --config-block /workspace/channel-artifacts/reliefchannel.block -o orderer.example.com:7053 --ca-file /workspace/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt --client-cert /workspace/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt --client-key /workspace/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
for org in government ngo auditor; do
  case "$org" in government) msp=GovernmentMSP; port=7051;; ngo) msp=NgoMSP; port=9051;; auditor) msp=AuditorMSP; port=11051;; esac
  docker run --rm --network reliefchain_fabric -v "$NET:/workspace" -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="$msp" -e CORE_PEER_ADDRESS="peer0.$org.example.com:$port" -e CORE_PEER_MSPCONFIGPATH="/workspace/organizations/peerOrganizations/$org.example.com/users/Admin@$org.example.com/msp" -e CORE_PEER_TLS_ROOTCERT_FILE="/workspace/organizations/peerOrganizations/$org.example.com/peers/peer0.$org.example.com/tls/ca.crt" hyperledger/fabric-tools:2.5.16 peer channel join -b /workspace/channel-artifacts/reliefchannel.block
done
echo "Fabric channel reliefchannel is running. Next: bash scripts/deploy-chaincode.sh"
