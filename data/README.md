Ten katalog jest uzywany jako lokalny storage aplikacji.

Pliki runtime `*.json` nie sa wersjonowane w Git, zeby nie wrzucac na GitHuba:

- danych uzytkownikow
- kontaktow
- szablonow
- ustawien
- logow

Repo zawiera tylko przykladowe pliki `*.example.json`.

Jesli katalog `data/` bedzie pusty, aplikacja odtworzy brakujace pliki przy pracy.
Brak `users.json` spowoduje utworzenie domyslnego konta `admin / admin`, wiec po starcie warto od razu zmienic haslo.

