import {defaults,validate,calculate} from "./hydraulics.mjs";
import {validateBarriers} from "./barriers.mjs";
import {gvfDefaults,validateGVF} from "./gvf-config.mjs";
export const materials=["Concreto","Mampostería de piedra","Tierra","Geomembrana","Otro"];
export const editableKeys=["section","q","b","z","n","height","freeboard","vmin","vmax","material","notes"];
export const coreKeys=Object.keys(defaults);
export function newProject(base={}){
 const d={...defaults,...base};
 return {...d,schemaVersion:4,gvf:gvfDefaults(base.gvf),material:base.material??"Concreto",materialNotes:base.materialNotes??"",datum:base.datum??"",
 start:base.start??0,end:base.end??100,step:base.step??10,startInvert:base.startInvert??0,
 barriers:base.barriers??[],profile:base.profile??[],grades:base.grades??[{end:100,slope:d.s}],overrides:base.overrides??{},
 planEnabled:base.planEnabled??false,easting:base.easting??0,northing:base.northing??0,azimuth:base.azimuth??0,crs:base.crs??"",
 plan:base.plan??[{end:100,type:"recta",radius:50,turn:"derecha"}]};
}
const finite=v=>typeof v==="number"&&Number.isFinite(v);
export const stationKey=s=>String(Number(s.toFixed(6)));
export function stationLabel(s){if(!finite(s))return "—";const a=Number(Math.abs(s).toFixed(2)),km=Math.floor(a/1000),m=(a-km*1000).toFixed(2).padStart(6,"0");return (s<0?"−":"")+km+"+"+m;}
export function parseStation(v){const s=String(v).trim().replace(",",".");if(/^\d+\+\d+(\.\d+)?$/.test(s)){const [km,m]=s.split("+").map(Number);if(m>=1000)throw Error("La parte después de + debe ser menor que 1000.");return km*1000+m;}if(!/^-?\d+(\.\d+)?$/.test(s))throw Error("Progresiva inválida. Usa 0+020 o metros.");return Number(s);}
export function parseProfile(text){
 const rows=text.trim().split(/\r?\n/).filter(s=>s.trim());if(!rows.length)throw Error("Pega al menos un punto.");
 return rows.map((line,i)=>{const cols=line.trim().split(/[;\t ]+/);if(cols.length!==2)throw Error("Fila "+(i+1)+": usa dos columnas, progresiva y cota.");const station=parseStation(cols[0]),ground=Number(cols[1].replace(",","."));if(!finite(ground))throw Error("Cota inválida en la fila "+(i+1)+".");return {station,ground};}).sort((a,b)=>a.station-b.station);
}
export function validateProject(input){
 const d=newProject(input);validate(d);
 for(const k of ["material","materialNotes","datum","crs"])if(typeof d[k]!=="string"||d[k].length>(k==="materialNotes"?2000:240))throw Error("Revisa "+k+".");
 if(!d.material.trim())throw Error("Define el material del canal.");
 for(const k of ["start","end","step","startInvert","easting","northing","azimuth"])if(!finite(d[k]))throw Error("Revisa el parámetro "+k+".");
 if(d.start<0||d.end<=d.start||d.end>1e8||d.step<=0||d.step<0.000001)throw Error("La progresiva final debe superar la inicial y el intervalo debe ser positivo.");
 if(Math.ceil((d.end-d.start)/d.step)>998)throw Error("Reduce la longitud o aumenta el intervalo: máximo 1000 secciones.");
 if(typeof d.planEnabled!=="boolean")throw Error("Revisa la activación de planta.");
 if(!Array.isArray(d.profile)||d.profile.length>1000)throw Error("Máximo 1000 puntos de terreno.");
 let prev=-Infinity;
 for(const p of d.profile){if(!p||!finite(p.station)||!finite(p.ground)||p.station<0||p.station>1e8||Math.abs(p.ground)>1e7||p.station<=prev)throw Error("Ordena el perfil por progresiva, sin duplicados, con cotas numéricas.");prev=p.station;}
 function segments(rows,kind){
  if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error("Define de 1 a 200 tramos de "+kind+".");
  let last=d.start;
  for(const a of rows){if(!a||!finite(a.end)||a.end<=last||a.end>d.end+1e-7)throw Error("Los finales de tramo deben crecer hasta la progresiva final.");
   if(kind==="rasante"&&(!finite(a.slope)||a.slope<=0||a.slope>1))throw Error("Las pendientes de rasante deben ser mayores que 0 y hasta 1 m/m (descenso positivo).");
   if(kind==="planta"&&(!["recta","curva"].includes(a.type)||!finite(a.radius)||a.radius<=0||!["derecha","izquierda"].includes(a.turn)))throw Error("Define rectas o curvas con radio positivo y sentido válido.");
   last=a.end;
  }
  if(Math.abs(last-d.end)>1e-7)throw Error("El último tramo de "+kind+" debe terminar en la progresiva final.");
 }
 segments(d.grades,"rasante");
 if(!Array.isArray(d.plan)||!d.plan.length||d.plan.length>200||d.plan.some(a=>!a||!finite(a.end)||!finite(a.radius)||a.radius<=0||!["recta","curva"].includes(a.type)||!["derecha","izquierda"].includes(a.turn)))throw Error("Geometría en planta inválida.");
 if(d.planEnabled)segments(d.plan,"planta");
 if(!d.overrides||typeof d.overrides!=="object"||Array.isArray(d.overrides)||Object.keys(d.overrides).length>1000)throw Error("Ajustes de sección inválidos.");
 const overrides={};
 for(const [key,patch] of Object.entries(d.overrides)){
  if(!/^\d+(\.\d+)?$/.test(key)||!finite(Number(key))||stationKey(Number(key))!==key||!patch||typeof patch!=="object"||Array.isArray(patch))throw Error("Ajuste por progresiva inválido.");
  if(Object.keys(patch).some(k=>!editableKeys.includes(k)))throw Error("Parámetro no permitido en una sección.");
  const local={...d,...patch};validate(local);if(typeof local.material!=="string"||local.material.length>240||!local.material.trim())throw Error("Material inválido en una sección.");
  overrides[key]=Object.fromEntries(editableKeys.filter(k=>k in patch).map(k=>[k,patch[k]]));
 }
 const barriers=validateBarriers(d.barriers,d);
 const result={barriers,gvf:validateGVF(d.gvf),...Object.fromEntries([...coreKeys,"schemaVersion","material","materialNotes","datum","start","end","step","startInvert","planEnabled","easting","northing","azimuth","crs"].map(k=>[k,d[k]])),profile:d.profile.map(p=>({station:p.station,ground:p.ground})),grades:d.grades.map(a=>({end:a.end,slope:a.slope})),plan:Array.isArray(d.plan)?d.plan.map(a=>({end:a.end,type:a.type,radius:a.radius,turn:a.turn})):[],overrides};
 const stations=stationList(result);if(stations.length>1000)throw Error("El perfil y los quiebres generan más de 1000 secciones. Aumenta el intervalo o reduce puntos.");
 return result;
}
export function stationList(d){
 const values=[d.start,d.end,...(d.barriers??[]).map(a=>a.station),...d.grades.map(a=>a.end),...d.profile.filter(p=>p.station>=d.start&&p.station<=d.end).map(p=>p.station),...(d.planEnabled?d.plan.map(a=>a.end):[])];
 const count=Math.floor((d.end-d.start)/d.step+1e-9);if(count>1000)throw Error("Demasiadas secciones.");
 for(let i=1;i<=count;i++)values.push(d.start+i*d.step);
 return [...new Set(values.filter(s=>s>=d.start-1e-7&&s<=d.end+1e-7).map(stationKey))].map(Number).sort((a,b)=>a-b);
}
export function gradeAt(d,s){
 let from=d.start,invert=d.startInvert;
 for(let i=0;i<d.grades.length;i++){const a=d.grades[i];if(s<a.end-1e-7||i===d.grades.length-1)return {invert:invert-(s-from)*a.slope,slope:a.slope};invert-=(a.end-from)*a.slope;from=a.end;}
 throw Error("Progresiva fuera de la rasante.");
}
export function terrainAt(profile,s){
 if(!profile.length||s<profile[0].station||s>profile.at(-1).station)return null;
 const exact=profile.find(p=>Math.abs(p.station-s)<1e-7);if(exact)return exact.ground;
 for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];if(s>a.station&&s<b.station)return a.ground+(b.ground-a.ground)*(s-a.station)/(b.station-a.station);}
 return null;
}
export function planAt(d,s){
 if(!d.planEnabled)return null;let E=d.easting,N=d.northing,theta=d.azimuth*Math.PI/180,from=d.start;
 for(const a of d.plan){const length=Math.max(0,Math.min(s,a.end)-from);if(length<=0)break;
 if(a.type==="recta"){E+=length*Math.sin(theta);N+=length*Math.cos(theta);}else{const k=(a.turn==="derecha"?1:-1)/a.radius,next=theta+k*length;E+=(Math.cos(theta)-Math.cos(next))/k;N+=(Math.sin(next)-Math.sin(theta))/k;theta=next;}
 if(s<=a.end)break;from=a.end;
 }
 return {easting:E,northing:N,azimuth:((theta*180/Math.PI)%360+360)%360};
}
export function buildSections(input){
 const d=validateProject(input);
 return stationList(d).map(station=>{
  const key=stationKey(station),patch=d.overrides[key]??{},grade=gradeAt(d,station),section={...d,...patch,s:grade.slope},r=calculate(section),ground=terrainAt(d.profile,station),plan=planAt(d,station);
  return {station,key,barriers:d.barriers.filter(a=>stationKey(a.station)===key),custom:Object.keys(patch).length>0,section,r,invert:grade.invert,slope:grade.slope,ground,water:grade.invert+r.yn,crown:grade.invert+section.height,groundMinusInvert:ground===null?null:ground-grade.invert,plan};
 });
}
