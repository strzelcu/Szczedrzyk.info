import { useEffect, useState } from "react";

type Point = {time: string; pm25: number | null; pm10: number | null};
type History = {points: Point[]; fetchedAt: string};
const key = "szczedrzyk-air-history-v1";
const date = (time: string) => new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Warsaw"}).format(new Date(time));
const hour = (time: string) => new Intl.DateTimeFormat("pl-PL", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw"}).format(new Date(time));
const value = (n: number | null) => n === null ? "—" : n.toLocaleString("pl-PL", {maximumFractionDigits: 1});
function cached(): History | null {
 try {
  const data = JSON.parse(localStorage.getItem(key) || "null");
  const age = Date.now() - Date.parse(data?.fetchedAt);
  return age >= 0 && age < 6 * 3600000 && Array.isArray(data?.points)
   && data.points.every((p: Point) => Number.isFinite(Date.parse(p.time)) && [p.pm25,p.pm10].every(n => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0))) ? data : null;
 } catch { return null; }
}
export function normalizeAirHistory(data: any): History {
 if (data?.city !== "Szczedrzyk" || data?.address !== "Opolska 1" || !Array.isArray(data.sensors)) throw Error("Unexpected station");
 const rows = new Map<number, Point>();
 for (const [name, field] of [["pm2_5","pm25"],["pm10","pm10"]] as const) {
  const sensor = data.sensors.find((s: any) => s.name === name);
  for (const row of Array.isArray(sensor?.data) ? sensor.data : []) {
   const t = typeof row.read_at === "string" ? Date.parse(row.read_at) : NaN;
   if (!Number.isFinite(t) || t > Date.now() + 60000 || t < Date.now() - 48 * 3600000) continue;
   const point = rows.get(t) || {time: new Date(t).toISOString(), pm25: null, pm10: null};
   point[field] = typeof row.value === "number" && Number.isFinite(row.value) && row.value >= 0 ? row.value : null;
   rows.set(t, point);
  }
 }
 const points = [...rows.values()].sort((a,b) => Date.parse(a.time)-Date.parse(b.time));
 if (!points.some(p => p.pm25 !== null || p.pm10 !== null)) throw Error("No history");
 return {points, fetchedAt: new Date().toISOString()};
}
export default function AirHistory({refreshToken}: {refreshToken: string | null}) {
 const [data,setData] = useState<History | null>(cached);
 const [loading,setLoading] = useState(true), [failed,setFailed] = useState(false);
 useEffect(() => {
  let active = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  setLoading(true);
  (async () => {
   try {
    const response = await fetch("https://api.syngeos.pl/api/public/data/device/10417/historical", {signal: controller.signal, cache: "no-store"});
    if (!response.ok) throw Error("Unavailable");
    const next = normalizeAirHistory(await response.json());
    if (!active) return;
    setData(next);setFailed(false);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
   } catch {
    if (active) { setFailed(true);setData(old => old && Date.now()-Date.parse(old.fetchedAt)<6*3600000 ? old : null); }
   } finally { clearTimeout(timeout);if(active)setLoading(false); }
  })();
  return () => {active=false;clearTimeout(timeout);controller.abort();};
 }, [refreshToken]);
 const points = data?.points.filter(p => Date.parse(p.time) >= Date.now()-25*3600000) || [];
 const range = points.length ? points.map(p => date(p.time)).filter((d,i,a) => a.indexOf(d)===i).map(d=>d.split("-").reverse().join(".")).join(" – ") : "";
 const max = Math.max(10, ...points.flatMap(p => [p.pm25 ?? 0,p.pm10 ?? 0]));
 const ceiling = Math.ceil(max * 1.1 / 10) * 10;
 const x = (i: number) => 48 + (Date.parse(points[i].time)-Date.parse(points[0].time))*680 / Math.max(1,Date.parse(points[points.length-1].time)-Date.parse(points[0].time));
 const y = (v: number) => 210 - v * 170 / ceiling;
 function path(field: "pm25" | "pm10") {
  let drawing = false;
  let previous = 0;
  return points.map((p,i) => {const n=p[field];if(n===null){drawing=false;return "";}if(Date.parse(p.time)-previous>90*60000)drawing=false;previous=Date.parse(p.time);const segment=(drawing?"L":"M")+x(i)+","+y(n);drawing=true;return segment;}).join(" ");
 }
 const stale = failed || Boolean(data && Date.now()-Date.parse(data.fetchedAt)>3600000);
 return <section className="air-forecast" aria-labelledby="air-forecast-title">
  <div className="section-heading"><h3 className="card-title" id="air-forecast-title">Historia pomiarów zanieczyszczenia</h3><span className="pill neutral">POMIARY SYNGEOS</span></div>
  <p className="card-note">Dane godzinowe z ostatniej doby udostępniane przez Syngeos dla czujnika przy ul. Opolskiej 1 w Szczedrzyku. Ostatnia godzina może być jeszcze niepełna.</p>
  {points.length ? <>
   <div className="chart-legend"><span className="legend-pm25">PM2,5</span><span className="legend-pm10">PM10</span><span>µg/m³ · {range}</span></div>
   <svg className="air-chart" viewBox="0 0 760 250" role="img" aria-labelledby="air-chart-title air-chart-desc">
    <title id="air-chart-title">Historia godzinowych stężeń pyłów z czujnika Syngeos</title><desc id="air-chart-desc">Oś pozioma: godziny czasu polskiego. Oś pionowa: stężenie w mikrogramach na metr sześcienny. Dokładne wartości dostępne w tabeli pod wykresem.</desc>
    {[0,1,2,3,4].map(i => {const n=ceiling*i/4;return <g key={i}><line x1="48" x2="728" y1={y(n)} y2={y(n)} stroke="#d9e3ed"/><text x="40" y={y(n)+4} textAnchor="end">{value(n)}</text></g>;})}
    {points.map((p,i) => i%3===0 || i===points.length-1 ? <text key={p.time} x={x(i)} y="236" textAnchor="middle">{hour(p.time)}</text> : null)}
    <path d={path("pm25")} fill="none" stroke="#147d75" strokeWidth="3"/><path d={path("pm10")} fill="none" stroke="#a15b19" strokeWidth="3" strokeDasharray="7 4"/>
    {points.map((p,i) => <g key={p.time}>{p.pm25!==null&&<circle cx={x(i)} cy={y(p.pm25)} r="3" fill="#147d75"><title>{hour(p.time)} · PM2,5: {value(p.pm25)} µg/m³</title></circle>}{p.pm10!==null&&<circle cx={x(i)} cy={y(p.pm10)} r="3" fill="#a15b19"><title>{hour(p.time)} · PM10: {value(p.pm10)} µg/m³</title></circle>}</g>)}
   </svg>
   <details className="forecast-values"><summary>Wartości godzinowe</summary><div className="hourly-scroll"><table className="hourly-table"><caption className="sr-only">Historyczne stężenia pyłów z Syngeos w µg/m³</caption><thead><tr><th scope="col">Godzina</th><th scope="col">PM2,5 (µg/m³)</th><th scope="col">PM10 (µg/m³)</th></tr></thead><tbody>{points.map(p=><tr key={p.time}><th scope="row">{date(p.time).slice(5).split("-").reverse().join(".")} {hour(p.time)}</th><td>{value(p.pm25)}</td><td>{value(p.pm10)}</td></tr>)}</tbody></table></div></details>
   <p className="section-meta">Pobrano: {data && new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(data.fetchedAt))}{loading?" · aktualizacja…":""}</p>
  </> : <p className="section-meta">{loading?"Pobieranie historii pomiarów…":"Historia pomiarów chwilowo niedostępna."}</p>}
  {stale && <p className="error-note" role="status">Nie udało się odświeżyć historii pomiarów.{points.length?" Widoczne są wcześniej pobrane pomiary.":""}</p>}
  <p className="section-meta">Źródło: <a className="source-link" href="https://panel.syngeos.pl/sensor/pm10?device=10417" target="_blank" rel="noreferrer">Syngeos · Szczedrzyk, Opolska 1</a></p>
 </section>;
}
