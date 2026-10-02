import {fetchJSON,numeric,headers} from "./environment-data.ts";
const time=(v:string|null)=>v&&Number.isFinite(Date.parse(v.replace(" ","T")+"Z"))?new Date(v.replace(" ","T")+"Z").toISOString():null;
export async function GET(){try{
 const riverResult=await fetchJSON("https://danepubliczne.imgw.pl/api/data/hydro/").then(data=>({data,error:false})).catch(()=>({data:[],error:true}));
 const rows=riverResult.data;
 if(!Array.isArray(rows))throw Error("Invalid water data");
 const ids=["150180100","150180020","150180190","150180230"];
 const stations=ids.map(id=>rows.find((r:any)=>r.id_stacji===id)).filter(Boolean).map((r:any)=>({id:r.id_stacji,name:r.stacja,river:r.rzeka,level:numeric(r.stan_wody),time:time(r.stan_wody_data_pomiaru),warning:numeric(r.stan_ostrzegawczy),alarm:numeric(r.stan_alarmowy),flow:numeric(r.przeplyw),flowTime:time(r.przeplyw_data)}));
 
 return Response.json({stations,riverUnavailable:riverResult.error},{headers});
}catch{return Response.json({error:"Dane hydrologiczne chwilowo niedostępne"},{status:503,headers});}}
