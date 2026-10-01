const freshFor=600000,retainFor=21600000;
const params=new URLSearchParams({latitude:"50.704167",longitude:"18.152222",current:"temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,shortwave_radiation",hourly:"temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day,shortwave_radiation",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,sunshine_duration,uv_index_max",timeformat:"unixtime",timezone:"Europe/Warsaw",forecast_days:"5"});
export const weatherUrl=`https://api.open-meteo.com/v1/forecast?${params}`;
type Weather={current:any;daily:any;hourly:any;fetchedAt:string};
let memory:Weather|null=null;
let pending:Promise<Weather>|null=null;
export function normalizeWeather(data:any):Weather{
 const c=data?.current,d=data?.daily;
 if(!c||typeof c.temperature_2m!=="number"||!Number.isFinite(c.temperature_2m)||typeof c.weather_code!=="number"||!Number.isFinite(data.utc_offset_seconds))throw Error("Invalid current weather");
 const toISO=(v:any)=>typeof v==="number"?new Date(v*1000).toISOString():new Date(Date.parse(v+"Z")-data.utc_offset_seconds*1000).toISOString();
 const time=toISO(c.time);
 const dates=d?.time?.map((v:any)=>typeof v==="number"?new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Warsaw"}).format(new Date(v*1000)):v);
 const keys=["weather_code","temperature_2m_max","temperature_2m_min","precipitation_probability_max","sunrise","sunset"];
 if(!Array.isArray(d?.time)||!d.time.length||!dates.every((v:any)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)))||!keys.every(k=>Array.isArray(d[k])&&d[k].length===d.time.length))throw Error("Invalid forecast");
 const h=data.hourly,hkeys=["temperature_2m","precipitation_probability","precipitation","weather_code","wind_speed_10m","is_day"];
 if(!Array.isArray(h?.time)||h.time.length<24||!hkeys.every(k=>Array.isArray(h[k])&&h[k].length===h.time.length))throw Error("Invalid hourly weather");
 return {current:{...c,time},daily:{...d,time:dates,sunrise:d.sunrise.map(toISO),sunset:d.sunset.map(toISO)},hourly:{...h,time:h.time.map(toISO)},fetchedAt:new Date().toISOString()};
}
async function loadWeather(){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await fetch(weatherUrl,{signal:AbortSignal.timeout(9000),headers:{Accept:"application/json"}});
   // Avoid immediately repeating requests rejected by the source's rate limit.
   if(r.status===429)throw Object.assign(Error("Weather rate limit"),{noRetry:true});
   if(!r.ok)throw Error("Weather source unavailable");
   const value=normalizeWeather(await r.json());memory=value;return value;
  }catch(e){if(attempt===1||(e as any)?.noRetry)throw e;}
 }
 throw Error("Weather unavailable");
}
function usable(value:Weather|null){return value&&Number.isFinite(Date.parse(value.fetchedAt))&&Date.now()-Date.parse(value.fetchedAt)<retainFor;}
export async function getWeather(requestUrl:string){
 let cache:Cache|null=null;
 const key=new Request(new URL("/api/weather-cache-v2",requestUrl));
 let previous=usable(memory)?memory:null;
 try{
  if(typeof caches!=="undefined"){
   cache=await caches.open("szczedrzyk-weather-v2");
   const r=await cache.match(key);
   if(r){const value=await r.json() as Weather;if(usable(value)&&(!previous||value.fetchedAt>previous.fetchedAt))previous=value;}
  }
 }catch{cache=null;}
 if(previous&&Date.now()-Date.parse(previous.fetchedAt)<freshFor)return {...previous,stale:false};
 try{
  pending??=loadWeather().finally(()=>{pending=null});
  const value=await pending;
  if(cache)try{await cache.put(key,Response.json(value,{headers:{"Cache-Control":"public, max-age=21600"}}));}catch{/* Cache failures must not hide valid weather. */}
  return {...value,stale:false};
 }catch{
  if(previous)return {...previous,stale:true};
  throw Error("No recent weather available");
 }
}
