import { useEffect, useState } from "react";

type Point = {time: string; pm25: number | null; pm10: number | null};
type Forecast = {points: Point[]; fetchedAt: string};
const key = "szczedrzyk-air-forecast-v1";
const date = (time: string) => new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Warsaw"}).format(new Date(time));
const hour = (time: string) => new Intl.DateTimeFormat("pl-PL", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw"}).format(new Date(time));
const value = (n: number | null) => n === null ? "—" : n.toLocaleString("pl-PL", {maximumFractionDigits: 1});
function cached(): Forecast | null {
 try {
  const data = JSON.parse(localStorage.getItem(key) || "null");
  const age = Date.now() - Date.parse(data?.fetchedAt);
  return age >= 0 && age < 6 * 3600000 && Array.isArray(data?.points)
   && data.points.every((p: Point) => Number.isFinite(Date.parse(p.time)) && [p.pm25,p.pm10].every(n => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0))) ? data : null;
 } catch { return null; }
}
export function normalizeAirForecast(data: any): Forecast {
 const h = data?.hourly;
 if (!Array.isArray(h?.time) || !h.time.length || !["pm2_5","pm10"].every(k => Array.isArray(h[k]) && h[k].length === h.time.length)) throw Error("Invalid forecast");
 const number = (v: any) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
 const points = h.time.map((t: any, i: number) => {
  if (typeof t !== "number" || !Number.isFinite(t)) throw Error("Invalid time");
  return {time: new Date(t * 1000).toISOString(), pm25: number(h.pm2_5[i]), pm10: number(h.pm10[i])};
 });
 if (!points.some((p: Point) => p.pm25 !== null || p.pm10 !== null)) throw Error("No forecast");
 return {points, fetchedAt: new Date().toISOString()};
}
export default function AirForecast({refreshToken}: {refreshToken: string | null}) {
 const [data,setData] = useState<Forecast | null>(cached);
 const [loading,setLoading] = useState(true), [failed,setFailed] = useState(false);
 useEffect(() => {
  let active = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  setLoading(true);
  (async () => {
   try {
    const params = new URLSearchParams({latitude:"50.704167",longitude:"18.152222",hourly:"pm2_5,pm10",timezone:"Europe/Warsaw",timeformat:"unixtime",forecast_days:"2",domains:"cams_europe"});
    const response = await fetch("https://air-quality-api.open-meteo.com/v1/air-quality?" + params, {signal: controller.signal});
    if (!response.ok) throw Error("Unavailable");
    const next = normalizeAirForecast(await response.json());
    if (!active) return;
    setData(next);setFailed(false);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
   } catch {
    if (active) { setFailed(true);setData(old => old && Date.now()-Date.parse(old.fetchedAt)<6*3600000 ? old : null); }
   } finally { clearTimeout(timeout);if(active)setLoading(false); }
  })();
  return () => {active=false;clearTimeout(timeout);controller.abort();};
 }, [refreshToken]);
 const today = date(new Date().toISOString());
 const points = data?.points.filter(p => date(p.time) === today) || [];
 const max = Math.max(10, ...points.flatMap(p => [p.pm25 ?? 0,p.pm10 ?? 0]));
 const ceiling = Math.ceil(max / 10) * 10;
 const x = (i: number) => 48 + i * 680 / Math.max(1, points.length-1);
 const y = (v: number) => 210 - v * 170 / ceiling;
 function path(field: "pm25" | "pm10") {
  let drawing = false;
  return points.map((p,i) => {const n=p[field];if(n===null){drawing=false;return "";}const segment=(drawing?"L":"M")+x(i)+","+y(n);drawing=true;return segment;}).join(" ");
 }
 const stale = failed || Boolean(data && Date.now()-Date.parse(data.fetchedAt)>3600000);
 return <section className="air-forecast" aria-labelledby="air-forecast-title">
  <div className="section-heading"><h3 className="card-title" id="air-forecast-title">Prognoza zanieczyszczenia na dziś</h3><span className="pill neutral">PROGNOZA MODELOWA</span></div>
  <p className="card-note">Szacowane stężenia PM2,5 i PM10 dla okolic Szczedrzyka. Model CAMS ENSEMBLE; wartości mogą różnić się od pomiarów lokalnego czujnika Syngeos.</p>
  {points.length ? <>
   <div className="chart-legend"><span className="legend-pm25">PM2,5</span><span className="legend-pm10">PM10</span><span>µg/m³ · {today.split("-").reverse().join(".")}</span></div>
   <svg className="air-chart" viewBox="0 0 760 250" role="img" aria-labelledby="air-chart-title air-chart-desc">
    <title id="air-chart-title">Godzinowa prognoza stężeń pyłów na dziś</title><desc id="air-chart-desc">Oś pozioma: godziny czasu polskiego. Oś pionowa: stężenie w mikrogramach na metr sześcienny. Dokładne wartości dostępne w tabeli pod wykresem.</desc>
    {[0,1,2,3,4].map(i => {const n=ceiling*i/4;return <g key={i}><line x1="48" x2="728" y1={y(n)} y2={y(n)} stroke="#d9e3ed"/><text x="40" y={y(n)+4} textAnchor="end">{value(n)}</text></g>;})}
    {points.map((p,i) => i%3===0 || i===points.length-1 ? <text key={p.time} x={x(i)} y="236" textAnchor="middle">{hour(p.time)}</text> : null)}
    <path d={path("pm25")} fill="none" stroke="#147d75" strokeWidth="3"/><path d={path("pm10")} fill="none" stroke="#a15b19" strokeWidth="3" strokeDasharray="7 4"/>
    {points.map((p,i) => <g key={p.time}>{p.pm25!==null&&<circle cx={x(i)} cy={y(p.pm25)} r="3" fill="#147d75"><title>{hour(p.time)} · PM2,5: {value(p.pm25)} µg/m³</title></circle>}{p.pm10!==null&&<circle cx={x(i)} cy={y(p.pm10)} r="3" fill="#a15b19"><title>{hour(p.time)} · PM10: {value(p.pm10)} µg/m³</title></circle>}</g>)}
   </svg>
   <details className="forecast-values"><summary>Wartości godzinowe</summary><div className="hourly-scroll"><table className="hourly-table"><caption className="sr-only">Prognozowane stężenia pyłów na dziś w µg/m³</caption><thead><tr><th scope="col">Godzina</th><th scope="col">PM2,5 (µg/m³)</th><th scope="col">PM10 (µg/m³)</th></tr></thead><tbody>{points.map(p=><tr key={p.time}><th scope="row">{hour(p.time)}</th><td>{value(p.pm25)}</td><td>{value(p.pm10)}</td></tr>)}</tbody></table></div></details>
   <p className="section-meta">Pobrano: {data && new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(data.fetchedAt))}{loading?" · aktualizacja…":""}</p>
  </> : <p className="section-meta">{loading?"Pobieranie prognozy jakości powietrza…":"Prognoza na dziś chwilowo niedostępna."}</p>}
  {stale && <p className="error-note" role="status">Nie udało się potwierdzić świeżej prognozy.{points.length?" Widoczne są wcześniej pobrane dane modelowe.":""}</p>}
  <p className="section-meta">Źródła: <a className="source-link" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo</a> · <a className="source-link" href="https://atmosphere.copernicus.eu/european-air-quality-forecast-plots" target="_blank" rel="noreferrer">Copernicus CAMS ENSEMBLE</a></p>
 </section>;
}
