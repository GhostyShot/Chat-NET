# DSGVO Leitlinien (EU)

## Grundsätze

- Datenminimierung: nur erforderliche Profildaten speichern
- Zweckbindung: Chat-Funktionalität, Sicherheit, Missbrauchsschutz
- Transparenz: klare Hinweise zu Datenverarbeitung im Onboarding

## Betroffenenrechte

- Auskunft über gespeicherte Kontodaten
- Löschung von Account + Credentials + Profilbild
- Export von Kernprofildaten und Auth-Metadaten

## Security für Auth

- Passwort-Hashing mit Argon2id
- Rate-Limits für Login/Reset
- E-Mail-Verifizierung für Passwortkonten
- Token mit Ablaufzeit und Secret-Rotation-Plan

## Infrastruktur

- Primäre Verarbeitung in EU-Regionen
- TLS verpflichtend für alle Umgebungen
- Zugriff auf Produktivdaten nur rollenbasiert und protokolliert