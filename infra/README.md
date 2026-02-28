# Infra Notes für chat-net.tech

## Ziel

- `api.chat-net.tech` -> API
- `chat-net.tech` -> Web Frontend

## DNS Vorschlag

- `A/AAAA` oder `CNAME` für `chat-net.tech`
- `CNAME` für `api.chat-net.tech`

## Deployment

- Staging: `staging.chat-net.tech`
- Production: `chat-net.tech`
- TLS via managed certificates

## Frontend auf Vercel

- Vercel Projekt auf `apps/web` als Root Directory konfigurieren
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable im Web-Projekt:
	- `VITE_API_URL=https://api.chat-net.tech`

## Neon Datenbank (API)

- In der API-Umgebung zwei URLs setzen:
	- `DATABASE_URL` = Neon pooled URL (`pgbouncer=true`)
	- `DIRECT_URL` = Neon direct URL (ohne Pooler)
- Prisma Migrationen immer mit gesetzter `DIRECT_URL` ausführen