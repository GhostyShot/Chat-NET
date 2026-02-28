# Chat-Net

Chat-Net ist eine Chatplattform für Web und Mobile mit Fokus auf junge Zielgruppen (Gaming, Communitys) und einem klaren, vertrauenswürdigen UX.

## Features im MVP

- 1:1 Chat
- Gruppen/Channels
- Datei-Upload (lokal über `/chat/upload`)
- Nachricht bearbeiten/löschen (eigene Nachrichten)
- Lesebestätigungen
- Tippindikator
- Suche (API-Stub vorbereitet)
- Realtime Presence (online/offline, last seen in-memory)
- Suche über Nachrichten (API + Web/Mobile UI)
- Moderation Basis: User blockieren
- Push-Benachrichtigungen (API-Stub vorbereitet)
- Auth: Google OAuth **und** E-Mail/Passwort

## Monorepo Struktur

- `apps/api` – Node.js + Express + Socket.IO API
- `apps/web` – React Web Client
- `apps/mobile` – React Native (Expo) Client
- `packages/shared` – gemeinsame TypeScript-Typen

## Quickstart

1. `npm install`
2. `.env.example` nach `.env` kopieren und Secrets setzen
3. PostgreSQL starten: `docker compose up -d`
4. Prisma Client + Migrationen: `npm run prisma:generate -w @chatnet/api` und `npm run prisma:migrate -w @chatnet/api -- --name init_auth`
5. API starten: `npm run dev:api`
6. Web starten: `npm run dev:web`
7. Mobile starten: `npm run dev:mobile`

## Hinweise

- Google Login prüft ID Tokens über `google-auth-library`; für lokale Entwicklung können `dev_*` Tokens über `GOOGLE_ALLOW_DEV_TOKENS=true` genutzt werden.
- User- und EmailToken-Daten werden über Prisma in PostgreSQL gespeichert.
- Für mobile Tests muss `apps/mobile/src/api.ts` ggf. auf die lokale Rechner-IP statt `localhost` zeigen (Simulator/Device-Netzwerk).