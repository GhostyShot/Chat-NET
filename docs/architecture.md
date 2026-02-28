# Chat-Net Architektur

## Überblick

- Clients: React Web (`apps/web`) und React Native/Expo (`apps/mobile`)
- API: Node.js + Express + Socket.IO (`apps/api`)
- Shared contracts: `packages/shared`
- Datenbankziel: PostgreSQL + Prisma (Schema vorhanden)

## Auth-Architektur

- Hybrid Login:
  - Google OAuth
  - E-Mail + Passwort
- Beide Flows erzeugen denselben Token-Typ (Access + Refresh)
- Pflicht-Sicherheitsflüsse:
  - E-Mail-Verifizierung
  - Passwort-Reset
  - Rate-Limit auf Login/Reset-Endpunkten

## Realtime Events (MVP)

- `join_room`
- `typing`
- `read_receipt`

## Nächste Backend-Schritte

1. Google ID-Token Server-seitig mit `google-auth-library` verifizieren
2. Upload-Service (signed URLs) und Malware-Scan Hook ergänzen
3. Search und Notifications als eigene Module implementieren

## API Endpunkte (aktueller Stand)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `GET /chat/channels`
- `POST /chat/channels`
- `GET /chat/channels/:channelId/messages`
- `POST /chat/channels/:channelId/messages`
- `PATCH /chat/channels/:channelId/messages/:messageId`
- `DELETE /chat/channels/:channelId/messages/:messageId`
- `POST /chat/channels/:channelId/read-receipts`
- `POST /chat/upload`
- `GET /chat/presence?userIds=<id,id>`
- `GET /chat/search?query=<text>&channelId=<optional>`
- `GET /chat/blocks`
- `POST /chat/block/:targetUserId`
- `DELETE /chat/block/:targetUserId`