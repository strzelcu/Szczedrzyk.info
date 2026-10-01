# Szczedrzyk

A local dashboard for Szczedrzyk featuring current weather, hourly and five-day
forecasts, sunrise and sunset times, readings from Syngeos sensor 10417, IMGW
warnings for Opole County and the Mała Panew catchment, the water surface elevation
of the Turawa reservoir, and river gauge readings at Turawa below the dam and
Staniszcze Wielkie.

## GitHub Pages

In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
The workflow builds and publishes the site on pushes to `main` and manual runs.
Live updates do not depend on a GitHub Actions schedule.

Default site URL: https://strzelcu.github.io/szczedrzyk/

The dashboard is static. The browser fetches public source APIs when opened,
hourly while open, when connectivity returns, when the tab becomes visible, and
when the refresh button is clicked. Last available results are stored separately
for each source in localStorage on this device. No API keys or external scheduling
service are required. A closed or suspended browser cannot update data in the background.
GitHub Actions still publishes initial fallback JSON during builds; live readings
are not committed to the repository. Storage failures do not prevent live updates.

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
sources. The browser stores the last available readings; older data and
errors are clearly marked. Cached weather data is retained for up to six hours.
An unavailable IMGW response does not mean there are no warnings.

The reservoir level comes from a periodic PDF report published by Wody Polskie,
rather than a live measurement. The Syngeos source describes the sensor location
as Szczedrzyk, ul. Opolska 1; its location at the school has not been confirmed.
Air quality measurements are indicative.

Data sources: Open-Meteo, Syngeos, IMGW-PIB, and Wody Polskie Gliwice.
IMGW data has been processed; operational data may be subject to corrections.
