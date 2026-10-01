import { useEffect, useState } from "react";
import { Waves, ExternalLink } from "lucide-react";
const fmt=(v:any,d=0)=>v===null||v===undefined||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("pl-PL",{maximumFractionDigits:d});
const stamp=(t:string)=>t?new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(t)):"Brak czasu pomiaru";
type Reading={id:string;time:string;level:number|null;flow:number|null;flowTime:string|null};
const cacheKey="szczedrzyk-river-history-v1";
function readHistory():Reading[]{try{const v=JSON.parse(localStorage.getItem(cacheKey)||"[]");return Array.isArray(v)?v.filter(r=>typeof r.id==="string"&&Number.isFinite(Date.parse(r.time))&&Date.parse(r.time)>Date.now()-3*86400000&&[r.level,r.flow].every(n=>n===null||typeof n==="number"&&Number.isFinite(n))):[];}catch{return [];}}
export default function WaterSection({result}:{result:{data:any;loading:boolean;error:boolean}}){
 const [history,setHistory]=useState<Reading[]>(readHistory);
 const h=result.data;
 useEffect(()=>{if(!h?.stations?.length||h.riverUnavailable)return;setHistory(old=>{
  const rows=old.filter(r=>Date.parse(r.time)>Date.now()-3*86400000);
  for(const s of h.stations){if(!s.time||Date.now()-Date.parse(s.time)>86400000||Date.parse(s.time)>Date.now()+60000)continue;
   const i=rows.findIndex(r=>r.id===s.id&&r.time===s.time),r={id:s.id,time:s.time,level:s.level,flow:s.flow,flowTime:s.flowTime};
   if(i>=0)rows[i]=r;else rows.push(r);
  }
  rows.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  try{localStorage.setItem(cacheKey,JSON.stringify(rows));}catch{}
  return rows;
 });},[h]);
 function trend(s:any,field:"level"|"flow"){
  const t=Date.parse(field==="level"?s.time:s.flowTime);
  if(!Number.isFinite(t)||s[field]===null||Date.now()-t>86400000)return null;
  const old=history.filter(r=>r.id===s.id&&r[field]!==null).map(r=>({v:r[field]!,t:Date.parse(field==="level"?r.time:r.flowTime||"")})).filter(r=>Math.abs(t-r.t-86400000)<=3600000).sort((a,b)=>Math.abs(t-a.t-86400000)-Math.abs(t-b.t-86400000))[0];
  return old?{delta:s[field]-old.v,hours:(t-old.t)/3600000}:null;
 }
 function station(s:any){
  const stale=!s.time||Date.now()-Date.parse(s.time)>86400000;
  const alarm=s.level!==null&&s.alarm!==null&&s.level>=s.alarm,warning=s.level!==null&&s.warning!==null&&s.level>=s.warning;
  const levelTrend=trend(s,"level"),flowTrend=trend(s,"flow");
  return <article className="water-station" key={s.id}><div className="water-station-head"><h3>{s.name==="Turawa"?"Turawa · poniżej zapory":s.name}</h3><span className={`pill ${stale||s.level===null?"stale":alarm?"danger":warning?"warning":"good"}`}>{stale?"Stary odczyt":s.level===null?"Brak odczytu":alarm?"Stan alarmowy":warning?"Stan ostrzegawczy":"Poniżej progów"}</span></div>
  <p className="river-label">Mała Panew · {s.name==="Staniszcze Wielkie"?"powyżej Jeziora Turawskiego":s.name==="Turawa"?"odpływ poniżej zbiornika":"górna część zlewni"}</p>
  <div className="water-value">{fmt(s.level)} <span>cm</span></div><p className="water-caption">Stan wody względem zera wodowskazu</p>
  <div className="water-thresholds"><span>Ostrzegawczy <strong>{fmt(s.warning)} cm</strong></span><span>Alarmowy <strong>{fmt(s.alarm)} cm</strong></span></div>
  <div className="station-detail"><span>Przepływ: <strong>{fmt(s.flow,2)} m³/s</strong></span><span className="pollutant-time">{stamp(s.flowTime)}{s.flowTime&&Date.now()-Date.parse(s.flowTime)>86400000?" · stary odczyt":""}</span></div>
  <p className="station-time">Stan wody: {stamp(s.time)}{stale&&s.time?` · ${new Date(s.time).getUTCFullYear()}`:""}</p>
  <p className="card-note">Zmiana około 24 h: {levelTrend?<strong>{levelTrend.delta>0?"+":""}{fmt(levelTrend.delta)} cm</strong>:"brak historii stanu wody"}{flowTrend?<> · przepływ <strong>{flowTrend.delta>0?"+":""}{fmt(flowTrend.delta,2)} m³/s</strong></>:null}</p>
  {s.name==="Staniszcze Wielkie"&&<p className="card-note">Wskaźnik sytuacji na rzece zasilającej jezioro. Przepływ w tej stacji nie jest całkowitym dopływem do zbiornika.</p>}
  {s.name==="Turawa"&&<p className="card-note">Pomiar rzeki poniżej zapory; nie przedstawia poziomu tafli jeziora.</p>}
  </article>;
 }
 const main=h?.stations?.filter((s:any)=>s.name==="Staniszcze Wielkie")||[];
 const extra=h?.stations?.filter((s:any)=>s.name!=="Staniszcze Wielkie")||[];
 return <section className="card water-section" aria-labelledby="water-title"><div className="water-heading"><div><h2 id="water-title"><Waves size={21}/>Wody w okolicy</h2><p>Mała Panew · pomiary w zlewni Jeziora Turawskiego</p></div><a className="source-link" href="https://hydro.imgw.pl/" target="_blank" rel="noreferrer">Mapa hydrologiczna IMGW <ExternalLink size={12}/></a></div>
 <div className="water-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))"}}>{main.map(station)}</div>
 {result.loading&&!h&&<p className="section-meta">Pobieranie pomiarów IMGW…</p>}
 {(result.error||h?.riverUnavailable)&&<p className="error-note" role="status">Nie udało się potwierdzić aktualnych danych IMGW.{h?" Widoczne są ostatnio pobrane odczyty.":""}</p>}
 {extra.length>0&&<details className="warning-entry"><summary>Dodatkowe pomiary w zlewni</summary><div className="water-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))"}}>{extra.map(station)}</div></details>}
 <p className="section-meta">Trend pochodzi z pomiarów zapisanych na tym urządzeniu. Porównuje odczyty oddalone o 23–25 godzin; wymaga historii z poprzedniej doby. Nie jest prognozą.</p>
 <p className="section-meta">Źródło: <a className="source-link" href="https://danepubliczne.imgw.pl/api/data/hydro/" target="_blank" rel="noreferrer">API IMGW (JSON)</a></p>
 </section>;
}
