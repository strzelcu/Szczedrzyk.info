import { normalizeWeather, weatherUrl } from "../../scripts/lib/weather-data";
import { GET as air } from "../../scripts/lib/air";
import { GET as water } from "../../scripts/lib/water";
import { GET as warnings } from "../../scripts/lib/warnings";

export type DataSource = "weather" | "air" | "water" | "warnings";
const prefix = "szczedrzyk-data-v1:";
const memory = new Map<DataSource, any>();
function valid(type: DataSource, data: any) {
 if (!data || data.error || !Number.isFinite(Date.parse(data.sourceFetchedAt))) return false;
 const age = Date.now() - Date.parse(data.sourceFetchedAt);
 return age >= -60000 && age < (type === "weather" ? 6 * 3600000 : 7 * 86400000)
  && (type === "weather" ? data.current && Array.isArray(data.daily?.time) && Array.isArray(data.hourly?.time)
   : type === "water" ? Array.isArray(data.stations)
   : type === "warnings" ? Array.isArray(data.warnings) && Array.isArray(data.failed) : typeof data.station === "string");
}
export function cachedData(type: DataSource) {
 try {
  const value = JSON.parse(localStorage.getItem(prefix + type) || "null");
  if (valid(type, value) && (!memory.has(type) || Date.parse(value.sourceFetchedAt) > Date.parse(memory.get(type).sourceFetchedAt))) memory.set(type, value);
 } catch { /* Storage may be blocked or damaged. */ }
 const data = memory.get(type);
 return valid(type, data) ? data : null;
}
async function publishedData(type: DataSource) {
 try {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${type}.json`, {cache: "no-store", signal: AbortSignal.timeout(15000)});
  if (!response.ok) return null;
  const data = await response.json();
  return valid(type, data) ? data : null;
 } catch { return null; }
}
export async function refreshData(type: DataSource) {
 let old = cachedData(type);
 if (!old) old = await publishedData(type);
 try {
  let data;
  if (type === "weather") {
   const response = await fetch(weatherUrl, {signal: AbortSignal.timeout(15000)});
   if (!response.ok) throw Error("Weather unavailable");
   data = normalizeWeather(await response.json());
  } else {
   const response = await ({air, water, warnings}[type])();
   data = await response.json();
   if (!response.ok || data.error) throw Error("Source unavailable");
  }
  if (type === "water") {
   if (data.riverUnavailable && old?.stations) data.stations = old.stations;
   if (data.reservoir?.unavailable && old?.reservoir && Date.parse(old.reservoir.time) > Date.parse(data.reservoir.time))
    data.reservoir = {...old.reservoir, unavailable: true};
  }
  if (type === "warnings" && data.failed.length && old?.warnings)
   data.warnings.push(...old.warnings.filter((row: any) => data.failed.includes(row.type) && (!row.until || Date.parse(row.until) > Date.now())));
  data.sourceFetchedAt = new Date().toISOString();
  memory.set(type, data);
  try { localStorage.setItem(prefix + type, JSON.stringify(data)); } catch { /* Keep fresh data in memory if storage is full. */ }
  return {data, loading: false, error: false};
 } catch {
  return {data: old, loading: false, error: true};
 }
}
