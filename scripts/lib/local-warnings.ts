export function normalizeWarnings(data:any,type:"meteo"|"hydro",now=Date.now()){
 if(!Array.isArray(data)){
  if(typeof data?.message==="string"&&/brak ostrzeżeń|no products were found/i.test(data.message))return [];
  throw Error("Unknown warning response");
 }
 const rows=[];
 for(const r of data){
  const areas=Array.isArray(r.obszary)?r.obszary:[];
  const raw=r.teryt??r.kody_teryt??areas.flatMap((a:any)=>a.teryt??a.kod_teryt??[]);
  const codes=(Array.isArray(raw)?raw:[raw]).map((a:any)=>String(typeof a==="object"?a.teryt??a.kod:a));
  if(type==="meteo"&&!codes.length)throw Error("Unknown county identifiers");
  if(type==="hydro"&&!areas.length)throw Error("Unknown catchments");
  const relevant=type==="meteo"?codes.some((c:string)=>c.startsWith("1609")):areas.some((a:any)=>a.wojewodztwo==="opolskie"&&/małej panwi|mała panew/i.test(a.opis??""));
  if(!relevant)continue;
  const start=r.obowiazuje_od??r.data_od,end=r.obowiazuje_do??r.data_do;
  const stamp=(v:any)=>typeof v==="string"?new Date(/[zZ]|[+-]\d\d:\d\d$/.test(v)?v:v.replace(" ","T")+"Z").toISOString():null;
  const from=stamp(start),until=String(end).startsWith("9999")?null:stamp(end);
  if(!from||(!until&&!String(end).startsWith("9999")))throw Error("Missing warning dates");
  if(until&&Date.parse(until)<=now)continue;
  const level=Number(r.stopien??r["stopień"]),title=r.nazwa_zdarzenia??r.zdarzenie,description=r.tresc??r.przebieg;
  if(!title||!description)throw Error("Missing warning content");
  rows.push({id:`${type}-${r.id??r.numer??title}-${from}`,type,title,description,level:Number.isFinite(level)?level:null,from,until,area:type==="meteo"?"Powiat opolski":areas.filter((a:any)=>a.wojewodztwo==="opolskie").map((a:any)=>a.opis).join(" · "),probability:r.prawdopodobienstwo??null});
 }
 return rows.sort((a,b)=>(b.level??0)-(a.level??0)||a.from.localeCompare(b.from));
}
