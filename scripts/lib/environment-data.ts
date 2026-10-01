export async function fetchJSON(url:string):Promise<any> {
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Accept:"application/ld+json, application/json, */*"}});
 if(!response.ok)throw new Error(`Source unavailable: ${response.status}`);
 return response.json();
}
export function numeric(value:unknown):number|null { if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null; }
// GIOŚ publishes local Polish time. Resolve the offset for the timestamp, including DST.
export function polishTime(value:string|null):string|null {
 if(!value)return null;
 const base=Date.parse(value.replace(" ","T")+"Z");
 if(!Number.isFinite(base))return null;
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Warsaw",timeZoneName:"shortOffset"}).formatToParts(new Date(base));
 const offset=parts.find(p=>p.type==="timeZoneName")?.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
 const minutes=offset?(Number(offset[2])*60+Number(offset[3]||0))*(offset[1]==="+"?1:-1):0;
 return new Date(base-minutes*60000).toISOString();
}
export const headers={"Cache-Control":"private, no-store"};
