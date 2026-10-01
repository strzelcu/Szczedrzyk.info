# Szczedrzyk

A local dashboard for Szczedrzyk featuring current weather, hourly and five-day
forecasts, sunrise and sunset times, readings from Syngeos sensor 10417, IMGW
warnings for Opole County and the Mała Panew catchment, the water surface elevation
of the Turawa reservoir, and river gauge readings at Turawa below the dam and
Staniszcze Wielkie.

## GitHub Pages

In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
The workflow runs on pushes to `main`, manually, and approximately every 15 minutes
(at minutes 7, 22, 37, and 52 of each hour). GitHub may delay scheduled runs.

Default site URL: https://strzelcu.github.io/szczedrzyk/

The dashboard is static. GitHub Actions fetches data and publishes JSON files
alongside the site. The refresh button checks the latest published update; it
does not trigger a new measurement or a workflow run. No API keys are required.

## Local development

Requires Node.js 24 or later:

```sh
npm ci
npm run data
npm run dev
```

`npm run build` generates the `dist/` directory. For a custom domain, set
`PAGES_BASE_PATH=/`. The workflow determines the base path from the Pages
configuration.

## Data freshness

Each source is fetched independently. A failed request does not block the other
sources. The Actions cache stores the last available readings; older data and
errors are clearly marked. Cached weather data is retained for up to six hours.
An unavailable IMGW response does not mean there are no warnings.

The reservoir level comes from a periodic PDF report published by Wody Polskie,
rather than a live measurement. The Syngeos source describes the sensor location
as Szczedrzyk, ul. Opolska 1; its location at the school has not been confirmed.
Air quality measurements are indicative.

GitHub disables scheduled workflows in public repositories after 60 days without
repository activity. If necessary, re-enable the workflow in the Actions tab.

Data sources: Open-Meteo, Syngeos, IMGW-PIB, and Wody Polskie Gliwice.
IMGW data has been processed; operational data may be subject to corrections.
