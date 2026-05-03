# Changelog

Wszystkie istotne zmiany w projekcie WEC Mailing Agent są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [0.2.2] - 2026-05-03

### Poprawki i ulepszenia
- Pełny audyt dostępności WCAG — `aria-label` na wszystkich przyciskach-ikonach, `htmlFor`/`id` na polach formularzy, `useId()` dla unikalnych ID w modalach
- Naprawiono brak focus ringu na polu wyszukiwania kontaktów (usunięto `outline: none`)
- Prawidłowy opis alternatywny (`alt`) dla awatarów użytkowników z Google
- Dodano `color-scheme: dark` — natywne kontrolki automatycznie dostosowują się do ciemnego motywu
- `touch-action: manipulation` na przyciskach i elementach nawigacji — eliminacja 300 ms opóźnienia na urządzeniach dotykowych
- Naprawiono `overscroll-behavior: contain` — przeniesiony na `.modal-content`, scroll nie przenika do strony
- Precyzyjne właściwości `transition` zamiast catch-all — poprawione animacje CSS
- Naprawiono skrypt `npm start` po konsolidacji serwera do `deploy/`

---

## [0.2.1] - 2026-04-28

### Nowe funkcje
- Wyszukiwanie informacji prasowych po tytule w edytorze mailingu
- Automatyczne pobieranie pliku `.docx` z Prowly newsroom po podaniu URL prasówki
- Konfiguracja przycisku pobierania `.docx` w edytorze szablonów (visual picker)

### Poprawki i ulepszenia
- Potwierdzenie kopiowania HTML — przycisk „Skopiuj HTML" sygnalizuje sukces
- Odświeżony UI komponentu wyboru prasówek (sloty IP 1/IP 2, segmented tabs, inline loading)
- Naprawa ścieżki wyjściowej builda frontendu (Vite → `deploy/dist-frontend`)
- Konsolidacja serwera — usunięto zduplikowane pliki z roota projektu (`server.js`, `routes/`, `dist-frontend/`)
- Aktualizacja `deploy/routes/auth.js`: logowanie po e-mailu, migracja schematu użytkowników
- Dodanie `dotenv` i `google-auth-library` do zależności `deploy/`

---

## [0.2.0] - 2025-04-27

### Nowe funkcje
- Integracja z Prowly — pobieranie ostatnich prasówek z RSS newsroomu
- Mapowanie elementów szablonu do informacji prasowych IP 1 i IP 2 (visual picker)
- Logowanie przez Google OAuth
- Pole e-mail w profilu użytkownika
- Pipeline CI/CD z GitHub Actions, Docker i ghcr.io

---

## [0.1.0] - 2025-04-01

### Pierwsze wydanie
- Edytor mailingu z podglądem na żywo (desktop/mobile)
- Zarządzanie szablonami z polami dynamicznymi
- Import kontaktów z CSV
- Wykrywanie i nadpisywanie kolorów w szablonach
- Eksport HTML / kopiowanie do schowka
- Dziennik zdarzeń (logi)
- Autosave wersji roboczej
