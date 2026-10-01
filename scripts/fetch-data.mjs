import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getWeather } from "./lib/weather-data.ts";
import { GET as air } from "./lib/air.ts";
import { GET as water } from "./lib/water.ts";
import { GET as warnings } from "./lib/warnings.ts";

const output = new URL("../public/data/", import.meta.url);
const cache = new URL("../.data-cache/", import.meta.url);
await Promise.all([mkdir(output, { recursive: true }), mkdir(cache, { recursive: true })]);
async function previous(name) {
  try { return JSON.parse(await readFile(new URL(`${name}.json`, cache), "utf8")); }
  catch { return null; }
}
async function response(fn) {
  const res = await fn();
  const data = await res.json();
  if (!res.ok || data.error) throw Error(data.error || `HTTP ${res.status}`);
  return data;
}
const sources = {
  weather: () => getWeather("https://strzelcu.github.io/Szczedrzyk.info/"),
  air: () => response(air),
  water: () => response(water),
  warnings: () => response(warnings),
};
let successes = 0;
await Promise.all(Object.entries(sources).map(async ([name, load]) => {
  const old = await previous(name);
  let data;
  try {
    data = await load();
    if (name === "water" && data.reservoir?.unavailable && old?.reservoir &&
        Date.parse(old.reservoir.time) > Date.parse(data.reservoir.time)) {
      data.reservoir = { ...old.reservoir, unavailable: true };
    }
    if (name === "water" && data.riverUnavailable && old?.stations) data.stations = old.stations;
    if (name === "warnings" && data.failed.length && old?.warnings) {
      const retained = old.warnings.filter(r => data.failed.includes(r.type) && (!r.until || Date.parse(r.until) > Date.now()));
      data.warnings.push(...retained);
    }
    data.sourceFetchedAt = new Date().toISOString();
    await writeFile(new URL(`${name}.json`, cache), JSON.stringify(data));
    successes++;
    console.log(`${name}: fetched`);
  } catch (error) {
    console.warn(`${name}: ${error.message}`);
    const age = Date.now() - Date.parse(old?.sourceFetchedAt);
    if (old && Number.isFinite(age) && age < (name === "weather" ? 6 * 3600000 : 7 * 86400000)) {
      data = { ...old, _fetchFailed: true };
      if (name === "weather") data.stale = true;
      if (name === "warnings") data.failed = ["meteo", "hydro"];
    } else data = { error: "Źródło danych chwilowo niedostępne" };
  }
  await writeFile(new URL(`${name}.json`, output), JSON.stringify(data));
}));
await writeFile(new URL("status.json", output), JSON.stringify({generatedAt: new Date().toISOString(), successes}));
if (!successes) console.warn("All sources unavailable; publishing explicit errors or dated cached readings.");
