import {fetchJSON,headers} from "./environment-data.ts";
import {normalizeWarnings} from "./local-warnings.ts";
export async function GET(){
 const results=await Promise.allSettled((["meteo","hydro"] as const).map(async type=>({type,warnings:normalizeWarnings(await fetchJSON(`https://danepubliczne.imgw.pl/api/data/warnings${type}`),type)})));
 const failed=results.flatMap((r,i)=>r.status==="rejected"?[i===0?"meteo":"hydro"]:[]);
 if(failed.length===2)return Response.json({error:"Nie udało się sprawdzić ostrzeżeń IMGW"},{headers,status:503});
 return Response.json({warnings:results.flatMap(r=>r.status==="fulfilled"?r.value.warnings:[]),failed,checkedAt:new Date().toISOString()},{headers});
}
