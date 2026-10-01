import {extractText} from "unpdf";
export const reservoirPage="https://www.gov.pl/web/wody-polskie-gliwice/aktualna-sytuacja-hydrologiczna";
const snapshot={name:"Zbiornik Turawa",level:173.75,time:"2026-09-29T06:00:00.000Z",source:"https://www.gov.pl/attachment/2a57c4e4-d23d-4177-a1b0-bc540eb88c50"};
let cached:{value:typeof snapshot;at:number}|null=null;
let pending:Promise<typeof snapshot>|null=null;
export function parseReservoirReport(text:string,source:string){
 const normalized=text.replace(/\s+/g," ");
 const row=normalized.match(/Zb\.?\s*Turawa\s+Ma[łl]a\s+Panew\s+([0-9]+[.,][0-9]+)/i);
 const date=normalized.match(/z dnia\s+(\d{4}-\d{2}-\d{2})\s+z godz\.\s*(\d{2}:\d{2})\s*\(UTC\)/i);
 if(!row||!date)throw Error("Report format changed");
 const level=Number(row[1].replace(",",".")),time=new Date(`${date[1]}T${date[2]}:00Z`).toISOString();
 if(level<160||level>185||Date.parse(time)>Date.now()+3600000)throw Error("Invalid reservoir reading");
 return {name:"Zbiornik Turawa",level,time,source};
}
async function request(url:string){
 const r=await fetch(url,{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error("Reservoir report unavailable");
 return r;
}
async function loadReport(){
 const html=await (await request(reservoirPage)).text();
 const links=[...html.matchAll(/<a\b[^>]*class="file-download"[^>]*href="(\/attachment\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
 .map(m=>({url:"https://www.gov.pl"+m[1],date:m[2].match(/(\d{2})\.(\d{2})\.(\d{4})/)?.slice(1)}))
 .filter(x=>x.date).sort((a,b)=>b.date!.slice().reverse().join("").localeCompare(a.date!.slice().reverse().join("")));
 if(!links.length)throw Error("No reservoir report");
 const source=links[0].url;
 const bytes=new Uint8Array(await (await request(source)).arrayBuffer());
 if(bytes.byteLength>3000000)throw Error("Report too large");
 const {text}=await extractText(bytes,{mergePages:true});
 const value=parseReservoirReport(text,source);
 cached={value,at:Date.now()};
 return value;
}
export async function fetchReservoir(){
 if(cached&&Date.now()-cached.at<600000)return {...cached.value,unavailable:false};
 try{
  pending??=loadReport().finally(()=>{pending=null});
  return {...await pending,unavailable:false};
 }catch{return {...(cached?.value??snapshot),unavailable:true};}
}
