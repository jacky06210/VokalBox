#!/usr/bin/env bash
set -euo pipefail

API_URL="http://127.0.0.1:3001/api/menu-scan/analyze"
API_KEY="REST-001"

echo "Test 1: Image trop petite (doit retourner 400)"
SMALL_PAYLOAD='{"images":["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="]}'
HTTP_CODE=$(curl -s -o /tmp/test_small_out -w "%{http_code}" -X POST "$API_URL" -H "Content-Type: application/json" -H "x-api-key: $API_KEY" -d "$SMALL_PAYLOAD" --max-time 15)
if [ "$HTTP_CODE" != "400" ]; then
  echo "❌ Échec: code attendu 400, obtenu $HTTP_CODE"
  echo "Réponse:"; cat /tmp/test_small_out
  exit 2
fi
echo "✅ OK: image trop petite rejetée (400)"

echo "\nTest 2: Image réelle (doit retourner 200 et success:true)"
REAL_PAYLOAD_FILE="/tmp/menu-payload.json"
if [ ! -f "$REAL_PAYLOAD_FILE" ]; then
  echo "Fichier $REAL_PAYLOAD_FILE manquant. Générer un payload d'image en base64 avant d'exécuter ce script."; exit 3
fi
HTTP_CODE=$(curl -s -o /tmp/test_real_out -w "%{http_code}" -X POST "$API_URL" -H "Content-Type: application/json" -H "x-api-key: $API_KEY" -d @"$REAL_PAYLOAD_FILE" --max-time 60)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Échec: code attendu 200, obtenu $HTTP_CODE"
  echo "Réponse:"; cat /tmp/test_real_out
  exit 4
fi
# vérifier success:true dans le body (fallback sans jq)
if grep -q '"success"[[:space:]]*:[[:space:]]*true' /tmp/test_real_out >/dev/null 2>&1; then
  echo "✅ OK: 'success' == true dans la réponse"
else
  echo "❌ Échec: 'success' != true dans la réponse"
  cat /tmp/test_real_out
  exit 5
fi

echo "✅ OK: image réelle traitée avec succès"

echo "\nTous les tests d'intégration ont réussi."