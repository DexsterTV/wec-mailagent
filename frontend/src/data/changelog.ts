export interface ChangelogEntry {
  version: string
  date: string
  sections: { label: string; items: string[] }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.3',
    date: '2026-05-13',
    sections: [
      {
        label: 'Poprawki szablonów',
        items: [
          'Usunięto ikony osadzone jako data:image/svg+xml URI — blokowane przez Prowly i klientów pocztowych, ikony nie były widoczne w wysłanym mailingu',
          'Naprawiono hardcoded href="mailto:..." i href="tel:..." w stopce — link używał zawsze domyślnego adresu zamiast danych wybranego kontaktu PR; teraz oba atrybuty są podmieniane dynamicznie przez placeholder',
        ],
      },
    ],
  },
  {
    version: '0.2.2',
    date: '2026-05-03',
    sections: [
      {
        label: 'Poprawki i ulepszenia',
        items: [
          'Pełny audyt dostępności WCAG — aria-label na wszystkich przyciskach ikon, htmlFor/id na polach formularzy, useId() dla unikalnych ID w modalach',
          'Naprawiono brak focus ringu na polu wyszukiwania kontaktów',
          'Prawidłowy opis alternatywny (alt) dla awatarów użytkowników z Google',
          'Dodano color-scheme: dark — natywne kontrolki (select, scrollbar) automatycznie dostosowują się do ciemnego motywu',
          'touch-action: manipulation na przyciskach i elementach nawigacji — eliminacja 300ms opóźnienia na urządzeniach dotykowych',
          'Naprawiono overscroll-behavior: contain na zawartości modala — przewijanie nie przenika do strony',
          'Precyzyjne właściwości transition (zamiast catch-all) — lepsze zachowanie CSS na animacjach',
          'Naprawiono skrypt startowy npm start po konsolidacji serwera do deploy/',
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-04-28',
    sections: [
      {
        label: 'Nowe funkcje',
        items: [
          'Wyszukiwanie informacji prasowych po tytule w edytorze mailingu',
          'Automatyczne pobieranie pliku .docx z Prowly newsroom po podaniu URL prasówki',
          'Konfiguracja przycisku pobierania .docx w edytorze szablonów (visual picker)',
        ],
      },
      {
        label: 'Poprawki i ulepszenia',
        items: [
          'Potwierdzenie kopiowania HTML — przycisk „Skopiuj HTML" sygnalizuje sukces',
          'Odświeżony UI komponentu wyboru prasówek (sloty IP 1/IP 2, segmented tabs, inline loading)',
          'Naprawa ścieżki wyjściowej builda frontendu (Vite → deploy/dist-frontend)',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-04-27',
    sections: [
      {
        label: 'Nowe funkcje',
        items: [
          'Integracja z Prowly — pobieranie ostatnich prasówek z RSS newsroomu',
          'Mapowanie elementów szablonu do informacji prasowych IP 1 i IP 2 (visual picker)',
          'Logowanie przez Google OAuth',
          'Pole e-mail w profilu użytkownika',
          'Pipeline CI/CD z GitHub Actions, Docker i ghcr.io',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-04-01',
    sections: [
      {
        label: 'Pierwsze wydanie',
        items: [
          'Edytor mailingu z podglądem na żywo (desktop/mobile)',
          'Zarządzanie szablonami z polami dynamicznymi',
          'Import kontaktów z CSV',
          'Wykrywanie i nadpisywanie kolorów w szablonach',
          'Eksport HTML / kopiowanie do schowka',
          'Dziennik zdarzeń (logi)',
          'Autosave wersji roboczej',
        ],
      },
    ],
  },
]
