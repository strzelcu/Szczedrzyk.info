import { useEffect, useState } from "react";
import { Sun, Flower2 } from "lucide-react";
const val=(n:any,d=1)=>typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("pl-PL",{maximumFractionDigits:d}):"—";
const day=(t:string)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Warsaw"}).format(new Date(t));
const hour=(t:string)=>new Intl.DateTimeFormat("pl-PL",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(t));
const names=[["grass_pollen","Trawy"],["birch_pollen","Brzoza"],["alder_pollen","Olcha"],["mugwort_pollen","Bylica"]] as const;
type Pollen={time:string;values:(number|null)[];fetchedAt:string};
const key="szczedrzyk-pollen-v1";
function valid(p:any):p is Pollen{return p&&Number.isFinite(Date.parse(p.time))&&Number.isFinite(Date.parse(p.fetchedAt))&&Date.now()-Date.parse(p.fetchedAt)>=0&&Date.now()-Date.parse(p.fetchedAt)<6*3600000&&Array.isArray(p.values)&&p.values.length===4&&p.values.every((v:any)=>v===null||typeof v==="number"&&Number.isFinite(v)&&v>=0);}
function cached(){try{const p=JSON.parse(localStorage.getItem(key)||"null");return valid(p)?p:null;}catch{return null;}}
export function normalizePollen(data:any):Pollen{
 const h=data?.hourly;if(!Array.isArray(h?.time)||!h.time.length)throw Error("Invalid pollen");
 const i=h.time.findIndex((t:any)=>typeof t==="number"&&t*1000>=Math.floor(Date.now()/3600000)*3600000);
 if(i<0||h.time[i]*1000>Date.now()+3600000)throw Error("No current pollen");
 return {time:new Date(h.time[i]*1000).toISOString(),values:names.map(([k])=>{const v=h[k]?.[i];return typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;}),fetchedAt:new Date().toISOString()};
}
export default function EnvironmentExtras({weather,refreshToken}:{weather:{data:any;loading:boolean;error:boolean};refreshToken:string|null}){
 const w=weather.data,today=day(new Date().toISOString()),i=w?.daily?.time.indexOf(today)??-1;
 const pts=(w?.hourly?.time||[]).map((time:string,j:number)=>({time,v:w.hourly.shortwave_radiation?.[j]??null})).filter((p:any)=>day(p.time)===today);
 const top=Math.ceil(Math.max(100,...pts.map((p:any)=>typeof p.v==="number"?p.v:0))/100)*100;
 const x=(j:number)=>48+j*680/Math.max(1,pts.length-1),y=(v:number)=>190-v*150/top;
 let drawing=false;
 const path=pts.map((p:any,j:number)=>{if(typeof p.v!=="number"||!Number.isFinite(p.v)){drawing=false;return "";}const s=(drawing?"L":"M")+x(j)+","+y(p.v);drawing=true;return s;}).join(" ");
 const [pollen,setPollen]=useState<Pollen|null>(cached),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);setLoading(true);
 (async()=>{try{const params=new URLSearchParams({latitude:"50.704167",longitude:"18.152222",hourly:names.map(n=>n[0]).join(","),timeformat:"unixtime",timezone:"Europe/Warsaw",forecast_days:"2",domains:"cams_europe"});
 const r=await fetch("https://air-quality-api.open-meteo.com/v1/air-quality?"+params,{signal:controller.signal});if(!r.ok)throw Error("Unavailable");const next=normalizePollen(await r.json());if(active){setPollen(next);setError(false);try{localStorage.setItem(key,JSON.stringify(next));}catch{}}}catch{if(active){setError(true);setPollen(old=>valid(old)?old:null);}}finally{clearTimeout(timer);if(active)setLoading(false);}})();
 return()=>{active=false;clearTimeout(timer);controller.abort();};},[refreshToken]);
 const old=weather.error||Boolean(w&&Date.now()-Date.parse(w.fetchedAt)>3600000);
 const currentRadiation=w?.current?.shortwave_radiation;
 return <><section className="card environment-section" aria-labelledby="sun-title"><div className="section-heading"><h2 id="sun-title"><Sun size={20}/>Słońce</h2><span className="pill neutral">PROGNOZA MODELOWA</span></div>
 <div className="environment-metrics"><div><span>Usłonecznienie dziś</span><strong>{val(i>=0&&typeof w.daily.sunshine_duration?.[i]==="number"?w.daily.sunshine_duration[i]/3600:null)} <small>h</small></strong></div><div><span>Maksymalny UV dziś</span><strong>{val(i>=0?w.daily.uv_index_max?.[i]:null)}</strong></div><div><span>Promieniowanie słoneczne</span><strong>{val(currentRadiation,0)} <small>W/m²</small></strong><span>{w?hour(w.current.time):""}</span></div></div>
 <p className="card-note">Usłonecznienie oznacza przewidywany czas świecenia słońca, a nie długość dnia. UV i promieniowanie to odrębne wskaźniki.</p>
 {pts.some((p:any)=>typeof p.v==="number")?<><div className="chart-legend">Promieniowanie godzinowe na dziś · W/m²</div><svg className="air-chart" viewBox="0 0 760 230" role="img" aria-labelledby="solar-chart-title"><title id="solar-chart-title">Prognoza promieniowania słonecznego na dziś. Średnie godzinowe w W/m²; czas polski.</title>{[0,1,2,3].map(j=><g key={j}><line x1="48" x2="728" y1={y(top*j/3)} y2={y(top*j/3)} stroke="#d9e3ed"/><text x="46" y={y(top*j/3)+4} textAnchor="end">{val(top*j/3,0)}</text></g>)}{pts.map((p:any,j:number)=>j%3===0?<text className={j%6!==0?"chart-tick-secondary":undefined} key={p.time} x={x(j)} y="215" textAnchor="middle">{hour(p.time)}</text>:null)}<path d={path} fill="none" stroke="#b47714" strokeWidth="3"/>{pts.map((p:any,j:number)=>typeof p.v==="number"?<circle key={p.time} cx={x(j)} cy={y(p.v)} r="3" fill="#b47714"><title>{hour(p.time)} · {val(p.v,0)} W/m²</title></circle>:null)}</svg>
 <details className="forecast-values"><summary>Wartości promieniowania godzinowego</summary><div className="hourly-scroll"><table className="hourly-table"><thead><tr><th>Godzina</th><th>W/m²</th></tr></thead><tbody>{pts.map((p:any)=><tr key={p.time}><th scope="row">{hour(p.time)}</th><td>{val(p.v,0)}</td></tr>)}</tbody></table></div></details></>:<p className="section-meta">{weather.loading?"Pobieranie danych o słońcu…":"Dane o promieniowaniu chwilowo niedostępne."}</p>}
 {old&&<p className="error-note">Widoczne są starsze dane pogodowe.</p>}<p className="section-meta">Źródło: <a className="source-link" href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo</a>{w?" · pobrano "+hour(w.fetchedAt):""}</p></section>
 <section className="card environment-section" aria-labelledby="pollen-title"><div className="section-heading"><h2 id="pollen-title"><Flower2 size={20}/>Pylenie roślin</h2><span className="pill neutral">PROGNOZA CAMS</span></div>
 <div className="environment-metrics">{names.map(([k,label],j)=><div key={k}><span>{label}</span><strong>{val(pollen?.values[j])} <small>ziaren/m³</small></strong></div>)}</div>
 <p className="card-note">Prognoza dla obszaru około 11 km. Dostępność zależy od sezonu; „—” oznacza brak danych, a 0 oznacza prognozowane zerowe stężenie.</p>
 {loading&&<p className="section-meta">Aktualizacja pylenia…</p>}{error&&<p className="error-note">Nie udało się odświeżyć prognozy pylenia.{pollen?" Widoczne są wcześniej pobrane dane.":""}</p>}
 {pollen&&<p className="section-meta">Godzina prognozy: {new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(pollen.time))} · pobrano {hour(pollen.fetchedAt)}</p>}
 <p className="section-meta">Źródło: <a className="source-link" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo / CAMS</a></p></section></>;
}
