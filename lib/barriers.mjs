import {G,geometry} from "./hydraulics.mjs";
export function newBarrier(station=0){return {id:globalThis.crypto.randomUUID(),name:"Barraje de lámina",station,mode:"crest",thickness:0.005,crest:0.4,opening:0,analysis:false,upstream:0,downstream:0,cdWeir:0.61,cdOrifice:0.61,notes:""};}
export function validateBarriers(items,d){
 if(!Array.isArray(items)||items.length>20)throw Error("Máximo 20 barrajes por proyecto.");
 const ids=new Set(),stations=[];
 return items.map((a,i)=>{
  const prefix="Barraje "+(i+1)+": ";
  if(!a||typeof a!=="object")throw Error(prefix+"datos inválidos.");
  for(const key of ["id","name","notes"])if(typeof a[key]!=="string"||a[key].length>(key==="notes"?2000:120))throw Error(prefix+"texto inválido.");
  if(!a.name.trim()||!a.id||!/^[a-zA-Z0-9-]+$/.test(a.id)||ids.has(a.id))throw Error(prefix+"nombre o identificador inválido.");ids.add(a.id);
  for(const k of ["station","thickness","crest","opening","upstream","downstream","cdWeir","cdOrifice"])if(typeof a[k]!=="number"||!Number.isFinite(a[k]))throw Error(prefix+"revisa "+k+".");
  if(a.station<d.start||a.station>d.end||a.thickness<=0||a.station+a.thickness>d.end+1e-7)throw Error(prefix+"ubica la lámina y su espesor dentro del canal.");
  if(!["crest","underflow"].includes(a.mode)||typeof a.analysis!=="boolean")throw Error(prefix+"configuración inválida.");
  const patch=d.overrides[String(Number(a.station.toFixed(6)))]??{},height=patch.height??d.height;
  if(a.crest<=0||a.crest>height||a.opening<0||a.opening>=a.crest)throw Error(prefix+"la cresta debe estar sobre la abertura y dentro de la altura del canal.");
  if(a.mode==="crest"&&a.opening!==0||a.mode==="underflow"&&a.opening<=0)throw Error(prefix+"define una abertura positiva para el paso inferior; en rebose debe ser cero.");
  if(a.upstream<0||a.downstream<0||a.upstream>1e5||a.downstream>1e5)throw Error(prefix+"los tirantes deben ser positivos o cero.");
  if(a.cdWeir<=0||a.cdWeir>1||a.cdOrifice<=0||a.cdOrifice>1)throw Error(prefix+"los coeficientes Cd deben ser mayores que cero y hasta 1.");
  for(const b of stations)if(a.station<b.end-1e-7&&a.station+a.thickness>b.start+1e-7)throw Error(prefix+"la lámina se superpone con otro barraje.");stations.push({start:a.station,end:a.station+a.thickness});
  return Object.fromEntries(["id","name","station","mode","thickness","crest","opening","analysis","upstream","downstream","cdWeir","cdOrifice","notes"].map(k=>[k,a[k]]));
 });
}
export function barrierRating(a,section){
 const b=section.section==="triangular"?0:section.b,z=section.section==="rectangular"?0:section.z;
 const width=b+2*z*a.crest,area=a.opening*(b+z*a.opening),crestHead=Math.max(0,a.upstream-a.crest);
 const info={width,area,crestHead,plateHeight:a.crest-a.opening,over:null,under:null,total:null,regime:"Sin evaluación",warnings:[]};
 if(!a.analysis)return info;
 const warnings=[];let over=0,under=0,orificeRegime="";
 if(a.upstream<a.downstream){warnings.push("Nivel aguas abajo mayor: el flujo inverso no se evalúa.");return {...info,regime:"Flujo inverso fuera de alcance",warnings};}
 if(crestHead>0){
  if(a.downstream>a.crest){over=null;warnings.push("Cresta sumergida: no se aplica la ecuación de rebose libre.");}
  else over=a.cdWeir*Math.sqrt(2*G)*((2/3)*width*crestHead**1.5+(8/15)*z*crestHead**2.5);
 }
 if(a.mode==="underflow"){
  if(a.upstream<a.opening){
   under=null;orificeRegime="Abertura sin cubrir";
   warnings.push("El agua no cubre la abertura por arriba: no se aplica el modelo de orificio; puede haber paso libre bajo la lámina.");
  }else{
   const wet=Math.min(a.opening,a.downstream),delta=Math.max(0,a.upstream-a.downstream);
   let integral=wet*(b+z*wet)*Math.sqrt(delta);
   if(wet<a.opening){const A=a.upstream-wet,B=Math.max(0,a.upstream-a.opening);
    const I0=(2/3)*(A**1.5-B**1.5),I1=(2*a.upstream/3)*(A**1.5-B**1.5)-(2/5)*(A**2.5-B**2.5);
    integral+=b*I0+2*z*I1;
   }
   under=a.cdOrifice*Math.sqrt(2*G)*integral;
   orificeRegime=a.downstream>=a.opening?"Orificio sumergido":a.downstream>0?"Orificio parcialmente sumergido":"Orificio libre";
   if(a.downstream>0&&a.downstream<a.opening)warnings.push("Sumergencia parcial: integración hidrostática idealizada; requiere validar el coeficiente.");
  }
 }
 if(z>0)warnings.push("Sección no rectangular: evaluación por integración de franjas con el ancho variable del canal; requiere calibración.");
 if(a.upstream>section.height)warnings.push("El tirante aguas arriba supera la altura del canal: el derrame lateral no está incluido.");
 if(a.upstream>section.height-section.freeboard)warnings.push("El tirante aguas arriba no deja el borde libre requerido.");
 const regime=over===null?"Rebose sumergido fuera de alcance":crestHead>0?(a.mode==="underflow"?"Rebose y paso inferior simultáneos":"Rebose libre"):a.mode==="underflow"?orificeRegime:"Sin rebose";
 return {...info,over,under,total:over===null||under===null?null:over+under,regime,warnings};
}
