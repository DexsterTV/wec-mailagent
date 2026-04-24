# WEC Mailing Agent - deploy na serwer

Ten katalog zawiera gotową paczkę runtime do wrzucenia na serwer:

- `server.js`
- `routes/`
- `dist-frontend/`
- `data/`
- `package.json` + `package-lock.json`

## 1. Wymagania

- Node.js 20.x
- npm 10+
- opcjonalnie: `pm2`
- opcjonalnie: `nginx`
- opcjonalnie: `docker` + `docker compose`

## 2. Upload na serwer

Przenieś cały katalog `deploy/` na serwer, np. do:

```bash
/var/www/wec-mailing-agent
```

## 3. Instalacja zależności

W katalogu aplikacji uruchom:

```bash
npm ci --omit=dev
```

## 4. Start aplikacji

Najprościej:

```bash
npm start
```

Aplikacja domyślnie startuje na porcie `3000`.

Możesz zmienić port:

```bash
PORT=3001 npm start
```

## 5. Start przez PM2

Jeśli używasz `pm2`:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6. Wystawienie przez Nginx

Przykładowa konfiguracja reverse proxy jest w pliku:

```bash
nginx-site.conf
```

Po stronie Nginx ustaw własną domenę i włącz site.

## 7. Dane aplikacji

Katalog `data/` zawiera bieżące dane:

- użytkowników
- kontakty
- szablony
- ustawienia
- logi

Jeśli chcesz wdrożyć czystą instancję, usuń lub podmień zawartość `data/` przed uploadem.

## 8. Ważne po wdrożeniu

Domyślny użytkownik w nowej instancji to `admin / admin`, ale w tej paczce są dołączone aktualne pliki z `data/`.

Jeśli serwer ma być dostępny publicznie:

- zadbaj o HTTPS
- ogranicz dostęp do panelu administracyjnego
- zrób backup katalogu `data/`
- nie trzymaj domyślnych haseł

## 9. Start przez Docker

Jeśli wolisz kontener:

```bash
docker compose up -d --build
```

W tym wariancie aplikacja będzie wystawiona na porcie `3000`.
