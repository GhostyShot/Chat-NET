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
- Profilverwaltung: Nickname + Username
- Eindeutige User-ID im Stil `username#CODE`
- Mentions/Pings via `@username`
- Gruppen-Moderation: Owner/Admin Rollen, Mitglieder entfernen, Rollen ändern
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
- Für stabile Prod-Validierung zusätzlich setzen:
	- API: `GOOGLE_CLIENT_ID` (Pflicht), optional `GOOGLE_CLIENT_IDS` (kommasepariert), `GOOGLE_STRICT_AUDIENCE=true`
	- Web: `VITE_GOOGLE_CLIENT_ID` muss exakt zu einem Client in der API-Konfiguration passen
- User- und EmailToken-Daten werden über Prisma in PostgreSQL gespeichert.
- Passwort-Reset läuft über E-Mail-Link: `/auth/forgot-password` verschickt einen persönlichen Link auf die Web-App (`WEB_APP_URL/?mode=reset&token=...`), danach wird nur das neue Passwort gesetzt.
- Für echten Mailversand SMTP-Variablen setzen (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
- Für mobile Tests/Deploys `apps/mobile/.env` mit `EXPO_PUBLIC_API_URL` setzen (z. B. lokale Rechner-IP statt `localhost` für Devices).

## Neon + Vercel Setup

1. Neon Projekt erstellen und DB anlegen.
2. In API-Env setzen:
	- `DATABASE_URL` (pooled)
	- `DIRECT_URL` (direct)
3. Migration ausführen:
	- `npm run prisma:migrate -w @chatnet/api -- --name prod_init`
4. Vercel Projekt für `apps/web` erstellen.
5. In Vercel setzen:
	- `VITE_API_URL=https://api.chat-net.tech`
	- `VITE_GOOGLE_CLIENT_ID=<deine-google-oauth-client-id>`
6. Domain verbinden:
	- `chat-net.tech` -> Vercel
	- `api.chat-net.tech` -> API-Hosting