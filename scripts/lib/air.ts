import {fetchJSON,numeric,headers} from "./environment-data.ts";
const grades=["grade-a","grade-b","grade-c","grade-d","grade-e","grade-f"];
const labels=["Bardzo dobry","Dobry","Umiarkowany","Dostateczny","Zły","Bardzo zły"];
function latest(sensor:any){
 const rows=Array.isArray(sensor?.data)?sensor.data:[];
 const row=rows.filter((r:any)=>numeric(r.value)!==null&&Number(r.value)>=0&&Number.isFinite(Date.parse(r.read_at))).sort((a:any,b:any)=>Date.parse(b.read_at)-Date.parse(a.read_at))[0];
 if(!row)return null;
 return {value:numeric(row.value),time:new Date(row.read_at).toISOString(),grade:grades.indexOf(row.current_norm)};
}
export async function GET(){try{
 // Public sensor linked by the municipality at https://ozimek.pl/.
 const data=await fetchJSON("https://api.syngeos.pl/api/public/data/device/10417");
 if(data.id!==10417||data.city!=="Szczedrzyk"||!Array.isArray(data.sensors))throw Error("Unexpected station");
 const pm10=latest(data.sensors.find((s:any)=>s.name==="pm10")),pm25=latest(data.sensors.find((s:any)=>s.name==="pm2_5"));
 if(!pm10&&!pm25)throw Error("No readings");
 const valid=[pm10,pm25].filter((r)=>r&&r.grade>=0&&Date.now()-Date.parse(r.time)<=21600000);
 const index=valid.length===2?Math.max(...valid.map(r=>r!.grade)):null;
 const indexTime=index===null?null:[pm10!.time,pm25!.time].sort()[0];
 return Response.json({station:`${data.city}, ul. ${data.address}`,index,label:index===null?"Brak aktualnej oceny":labels[index],indexTime,pm10,pm25},{headers});
 }catch{return Response.json({error:"Pomiary ze Szczedrzyka chwilowo niedostępne"},{status:503,headers});}
}
