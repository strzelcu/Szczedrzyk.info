# Szczedrzyk

Lokalny dashboard Szczedrzyka: pogoda bieżąca, prognoza godzinowa i pięciodniowa,
wschód i zachód słońca, czujnik Syngeos 10417, ostrzeżenia IMGW dla powiatu
opolskiego i zlewni Małej Panwi, tafla zbiornika Turawa oraz wodowskazy Turawa
poniżej zapory i Staniszcze Wielkie.

## GitHub Pages

W Settings → Pages → Build and deployment ustaw Source na **GitHub Actions**.
Workflow uruchamia się po zmianie `main`, ręcznie i co około 15 minut
(minuty 7, 22, 37, 52). GitHub może opóźniać uruchomienia. Domyślny adres:
https://strzelcu.github.io/szczedrzyk/

Dashboard jest statyczny. Actions pobiera dane i publikuje pliki JSON razem
ze stroną. Przycisk odświeżania sprawdza ostatnią opublikowaną aktualizację;
nie uruchamia nowego pomiaru ani workflow. Nie są potrzebne klucze API.

## Rozwój lokalny

Node.js 24 lub nowszy:

```sh
npm ci
npm run data
npm run dev
```

`npm run build` tworzy `dist/`. Dla domeny własnej ustaw `PAGES_BASE_PATH=/`;
workflow dobiera ścieżkę z konfiguracji Pages.

## Aktualność danych

Każde źródło jest pobierane niezależnie. Nieudane pobranie nie blokuje reszty.
Cache Actions przechowuje ostatnie poprawne odczyty; starsze dane i błędy są
oznaczone. Pogoda z cache jest dostępna maksymalnie przez 6 godzin. Brak
odpowiedzi IMGW nie oznacza braku ostrzeżeń. Poziom zbiornika pochodzi z
okresowego raportu PDF Wód Polskich, a nie z pomiaru na żywo. Czujnik Syngeos
jest opisany przez źródło jako Szczedrzyk, ul. Opolska 1; lokalizacja w szkole
nie została potwierdzona. Pomiary jakości powietrza są orientacyjne.

GitHub wyłącza zaplanowane workflow w publicznych repozytoriach po 60 dniach
bez aktywności w repozytorium. W razie potrzeby włącz workflow ponownie w Actions.

Źródła: Open-Meteo, Syngeos, IMGW-PIB, Wody Polskie Gliwice.
Dane IMGW zostały przetworzone; dane operacyjne mogą podlegać korektom.
