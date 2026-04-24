# WEC Mailing Agent

WEC Mailing Agent to aplikacja do przygotowywania mailingow PR.

Repo zawiera:

- backend `Node.js + Express`
- frontend `React + Vite`
- zapis danych do plikow JSON w katalogu `data/`
- gotowe materialy deployowe w `deploy/` i `deploy-docker/`

## Stack i port

- backend: `Node.js + Express`
- frontend dev: `Vite`
- port aplikacji w kontenerze: `3000`
- port deweloperski Vite: `5173`

## Baza danych

Projekt nie wymaga osobnej bazy danych.
Dane sa przechowywane lokalnie w plikach JSON:

- `data/users.json`
- `data/templates.json`
- `data/contacts.json`
- `data/settings.json`
- `data/logs.json`

Pliki runtime z `data/` nie sa wersjonowane w Git. W repo zostaly tylko przykladowe pliki i dokumentacja katalogu.

## Uruchomienie lokalnie

### Backend

```bash
npm install
npm start
```

Backend wystartuje domyslnie na `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend deweloperski bedzie dostepny na `http://localhost:5173` i proxyuje `/api` do backendu.

## Build frontendu

```bash
cd frontend
npm run build
```

Build trafia do katalogu `dist-frontend/`, z ktorego backend serwuje aplikacje.

## Docker

Glowny kontener nasluchuje wewnatrz na porcie `3000`.
Przykladowe mapowanie portow:

```yaml
ports:
  - "8004:3000"
```

Do konfiguracji portu mozesz uzyc `.env` na podstawie `.env.example`.

