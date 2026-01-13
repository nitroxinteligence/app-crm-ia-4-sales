# Comandos Baileys (1 linha, sem quebra)

> Substitua os valores de `GROUP_JID` e `LID` conforme necessário.

## 1) Listar grupos disponíveis
curl -H "X-API-KEY: TpBEBSxSkB8HTmpAwPLLvUMBBXlwjg2h" "http://localhost:7001/sessions/dffa5a5d-8912-409b-b639-e742b7150840/groups"

## 2) Buscar participantes de um grupo
curl -H "X-API-KEY: TpBEBSxSkB8HTmpAwPLLvUMBBXlwjg2h" "http://localhost:7001/sessions/dffa5a5d-8912-409b-b639-e742b7150840/group-participants?jid=GROUP_JID"

## 3) Foto do grupo (profile-picture)
curl -H "X-API-KEY: TpBEBSxSkB8HTmpAwPLLvUMBBXlwjg2h" "http://localhost:7001/sessions/dffa5a5d-8912-409b-b639-e742b7150840/profile-picture?jid=GROUP_JID"

## 4) Foto do participante (LID) com groupJid
curl -H "X-API-KEY: TpBEBSxSkB8HTmpAwPLLvUMBBXlwjg2h" "http://localhost:7001/sessions/dffa5a5d-8912-409b-b639-e742b7150840/profile-picture?jid=LID&groupJid=120363424227582156"

## 5) Backfill avatars (forçado)
curl -X POST "http://localhost:7001/sessions/dffa5a5d-8912-409b-b639-e742b7150840/backfill-avatars" -H "X-API-KEY: TpBEBSxSkB8HTmpAwPLLvUMBBXlwjg2h" -H "Content-Type: application/json" -d '{"leadLimit": 300, "messageLimit": 500, "force": true}'
