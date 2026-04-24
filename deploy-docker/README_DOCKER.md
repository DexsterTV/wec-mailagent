# WEC Mailing Agent - wersja pod Docker

Ten katalog jest przygotowany pod szybkie wdrożenie przez Docker Compose.

## Co jest w środku

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `server.js`
- `routes/`
- `dist-frontend/`
- `data/`
- `package.json`
- `package-lock.json`

## Wymagania

- Docker
- Docker Compose

## Szybki start na serwerze

1. Skopiuj cały katalog na serwer, np. do:

```bash
/opt/wec-mailing-agent
```

2. Wejdź do katalogu aplikacji:

```bash
cd /opt/wec-mailing-agent
```

3. Utwórz plik `.env` na podstawie przykładu:

```bash
cp .env.example .env
```

4. Uruchom aplikację:

```bash
docker compose up -d --build
```

5. Podejrzyj logi:

```bash
docker compose logs -f
```

## Dostęp do aplikacji

Domyślnie aplikacja będzie dostępna na:

```bash
http://IP_SERWERA:3000
```

Jeśli zmienisz `PORT` w `.env`, zewnętrzny port też się zmieni.

## Dane aplikacji

Katalog `data/` jest podpięty jako bind mount:

```bash
./data:/app/data
```

To znaczy:

- dane przetrwają restart kontenera
- możesz je backupować bez wchodzenia do kontenera
- paczka zawiera aktualny stan danych z Twojego projektu

Jeśli chcesz wystawić czystą instancję, wyczyść lub podmień pliki w `data/` przed uruchomieniem.

## Aktualizacja aplikacji

Po wrzuceniu nowej wersji plików:

```bash
docker compose down
docker compose up -d --build
```

## Backup danych

Najważniejszy katalog do backupu:

```bash
data/
```

Znajdziesz tam:

- użytkowników
- szablony
- kontakty
- ustawienia
- logi

## Ważne

- jeśli aplikacja ma być publiczna, warto postawić przed nią Nginx lub Traefik
- zadbaj o HTTPS
- nie trzymaj domyślnych haseł
- regularnie backupuj katalog `data/`
