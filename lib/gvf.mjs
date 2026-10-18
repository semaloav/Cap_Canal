import {G,geometry,calculate} from "./hydraulics.mjs";
import {barrierRating} from "./barriers.mjs";
import {buildSections,stationLabel} from "./project.mjs";
import {validateGVF} from "./gvf-config.mjs";

export function flowState(section,invert,y) {
 if(!Number.isFinite(y)||y<=0)throw Error("Tirante FGV inválido.");
 const a=geometry(section,y),v=section.q/a.area,vhead=v*v/(2*G),sf=(section.q*section.n/(a.area*a.radius**(2/3)))**2;
 if(![a.area,a.depth,v,vhead,sf,invert+y+vhead].every(Number.isFinite)||a.area<=0||a.depth<=0)throw Error("Estado FGV fuera del rango numérico; revisa las dimensiones y el contorno.");
 return {y,water:invert+y,egl:invert+y+vhead,v,vhead,fr:v/Math.sqrt(G*a.depth),sf,area:a.area,remaining:section.height-y};
}
function bisect(fn,lo,hi,tolerance) {
 let flo=fn(lo),fhi=fn(hi),mid=lo,fmid=flo;
 if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return null;
 for(let iterations=1;iterations<=160;iterations++) {
  mid=(lo+hi)/2;fmid=fn(mid);
  if(!Number.isFinite(fmid))return null;
  if(Math.abs(fmid)<=tolerance)return {y:mid,residual:Math.abs(fmid),iterations};
  if(flo*fmid<=0){hi=mid;fhi=fmid;}else{lo=mid;flo=fmid;}
 }
 return null;
}
// Branch search is necessary because friction can introduce extra roots. Prefer
// the root continuous with the previous section, then refine the distance.
function stepRoot(row,known,dx,c,direction) {
 const yc=row.r.yc,lo=c.regime==="subcritical"?yc*(1+1e-7):Math.max(1e-9,yc*1e-5);
 const hi=c.regime==="subcritical"?Math.max(yc*128,known.y*16,row.section.height*8):yc*(1-1e-7);
 const residual=y=>{
  const t=flowState(row.section,row.invert,y),u=direction<0?t:known,v=direction<0?known:t;
  const hf=(u.sf+v.sf)*dx/2,coefficient=v.vhead>u.vhead?c.contraction:c.expansion;
  return u.egl-v.egl-hf-coefficient*Math.abs(v.vhead-u.vhead);
 };
 const points=[lo,hi,Math.min(hi,Math.max(lo,known.y)),Math.min(hi,Math.max(lo,row.r.yn))];
 for(let i=1;i<100;i++)points.push(lo*(hi/lo)**(i/100));
 points.sort((a,b)=>a-b);const roots=[];
 for(let i=1;i<points.length;i++) {
  const a=points[i-1],b=points[i],fa=residual(a),fb=residual(b);
  if(Number.isFinite(fa)&&Number.isFinite(fb)&&fa*fb<=0){const root=bisect(residual,a,b,c.tolerance);if(root)roots.push(root);}
 }
 return roots.sort((a,b)=>Math.abs(Math.log(a.y/known.y))-Math.abs(Math.log(b.y/known.y)))[0]??null;
}
function intermediate(a,b,t) {
 const section={...a.section};
 for(const k of ["b","z","n","height","freeboard","vmin","vmax"])section[k]=a.section[k]+(b.section[k]-a.section[k])*t;
 const invert=a.invert+(b.invert-a.invert)*t;
 return {...a,station:a.station+(b.station-a.station)*t,section,invert,r:calculate(section)};
}
function reach(target,source,known,c,direction,level=0) {
 const dx=Math.abs(target.station-source.station),root=stepRoot(target,known,dx,c,direction);
 if(root){const state=flowState(target.section,target.invert,root.y),u=direction<0?state:known,v=direction<0?known:state;
  return {...state,...root,substeps:1,hf:(u.sf+v.sf)*dx/2,hl:(v.vhead>u.vhead?c.contraction:c.expansion)*Math.abs(v.vhead-u.vhead)};}
 if(level>=8||dx<1e-5)throw Error("No converge en "+stationLabel(target.station)+". Revisa el contorno, reduce el intervalo o evalúa un régimen mixto/salto hidráulico.");
 const mid=intermediate(source,target,.5),first=reach(mid,source,known,c,direction,level+1),last=reach(target,mid,first,c,direction,level+1);
 return {...last,hf:first.hf+last.hf,hl:first.hl+last.hl,substeps:first.substeps+last.substeps,iterations:first.iterations+last.iterations,residual:Math.max(first.residual,last.residual)};
}
export function plateDischarge(a,section,upstream,downstream) {
 const free=barrierRating({...a,analysis:true,upstream,downstream:Math.min(downstream,a.crest)},section);
 if(free.total===null)return null;
 // Orifice tailwater must use the actual depth, not the clipped weir tailwater.
 const actual=barrierRating({...a,analysis:true,upstream,downstream},section);
 let over=free.over??0;
 if(over>0&&downstream>a.crest){const ratio=(downstream-a.crest)/(upstream-a.crest);over*=Math.max(0,1-ratio**1.5)**.385;}
 const under=actual.under;
 if(under===null)return null;
 return {total:over+under,over,under,submerged:downstream>a.crest&&over>0};
}
function plateUpstream(a,row,tail,c) {
 const downstream=tail.water-row.invert,low=Math.max(downstream,a.mode==="underflow"?a.opening:a.crest)+1e-10;
 let high=Math.max(low*2,row.section.height*2,1);
 const fn=y=>{const rating=plateDischarge(a,row.section,y,downstream);return rating===null?NaN:rating.total-row.section.q;};
 if(fn(low)>c.tolerance)throw Error(a.name+": la abertura no está cubierta en la solución; requiere flujo libre bajo la lámina o régimen mixto.");
 for(let i=0;i<40&&fn(high)<0;i++)high*=2;
 const root=bisect(fn,low,high,Math.max(1e-10,row.section.q*1e-8));
 if(!root)throw Error(a.name+": no se pudo resolver el control hidráulico.");
 const state=flowState(row.section,row.invert,root.y),rating=plateDischarge(a,row.section,root.y,downstream);
 if(state.fr>=1)throw Error(a.name+": el control requiere un régimen mixto; no se prolonga como FGV subcrítico.");
 if(state.egl<tail.egl-c.tolerance)throw Error(a.name+": niveles incompatibles con el balance de energía; revisa el contorno o el régimen mixto.");
 return {...state,iterations:root.iterations,residual:0,substeps:0,control:{name:a.name,...rating,qResidual:root.residual},hf:0,hl:Math.max(0,state.egl-tail.egl)};
}
export function solveGVF(input) {
 const original=buildSections(input),c=validateGVF(input.gvf),warnings=[],nodes=[];
 const q=original[0].section.q;
 if(original.some(r=>Math.abs(r.section.q-q)>Math.max(1e-12,q*1e-9)))return {rows:[],warnings,error:"FGV requiere caudal constante en esta versión. Iguala Q en las progresivas; los aportes laterales requieren un balance adicional.",complete:false};
 if(original.some(r=>r.section.section!==original[0].section.section))return {rows:[],warnings,error:"FGV requiere la misma familia de sección. Puedes variar b, z y n; los cambios de familia requieren una transición definida.",complete:false};
 for(const row of original) {
  const a=row.barriers[0];
  if(a){nodes.push({...row,key:row.key+":up",side:"Aguas arriba",plate:a},{...row,key:row.key+":down",side:"Aguas abajo",barriers:[]});}
  else nodes.push({...row,side:""});
 }
 const direction=c.regime==="subcritical"?-1:1,first=direction<0?nodes.length-1:0;
 const results=nodes.map(r=>({...r,state:null,status:"Sin calcular",dx:null,hf:null,hl:null}));
 let error="";
 try {
  const row=nodes[first];let y=c.depth;
  if(c.boundary==="stage")y=c.stage-row.invert;
  if(c.boundary==="normal")y=calculate({...row.section,s:c.energySlope}).yn;
  if(c.boundary==="critical")y=row.r.yc*(direction<0?1+1e-5:1-1e-5);
  if(!(y>0))throw Error("El contorno debe estar sobre la cota de fondo.");
  const state=flowState(row.section,row.invert,y);
  if(direction<0&&state.fr>=1||direction>0&&state.fr<=1)throw Error("El contorno no coincide con el régimen seleccionado. Revisa el tirante o la pendiente de energía.");
  results[first]={...results[first],state:{...state,iterations:0,residual:0,substeps:0},status:"Contorno"};
  for(let i=first+direction;i>=0&&i<nodes.length;i+=direction) {
   const target=nodes[i],previous=nodes[i-direction],known=results[i-direction].state;
   let next;
   if(target.station===previous.station) {
    if(direction>0)throw Error("Barraje en régimen supercrítico: requiere resolver el control y un posible salto con régimen mixto.");
    next=plateUpstream(target.plate,target,known,c);
    warnings.push(target.plate.name+": control de lámina delgada, Cd definido por el usuario; se desprecia velocidad de aproximación. "+(next.control.submerged?"Rebose sumergido con corrección empírica de Villemonte. ":"")+(target.r.z>0?"Ancho variable: calibrar integración por franjas.":""));
   } else {
    next=reach(target,previous,known,c,direction);
   }
   results[i]={...results[i],state:next,status:next.control?"Control barraje":"Converge",dx:Math.abs(target.station-previous.station),hf:next.hf,hl:next.hl};
  }
 } catch(e){error=e instanceof Error?e.message:String(e);}
 for(const r of results)if(r.state&&r.state.remaining<0){warnings.push("El agua supera la coronación; el derrame lateral no está incluido. El perfil pierde validez a partir del desborde.");break;}
 if(results.some(r=>r.state&&Math.abs(r.state.fr-1)<.02))warnings.push("Hay secciones cercanas al crítico: reduce el intervalo y revisa la sensibilidad del perfil.");
 if(c.boundary==="critical")warnings.push("Contorno crítico: se usa un desplazamiento relativo de 10⁻⁵ hacia la rama seleccionada para iniciar el cálculo.");
 return {rows:results,warnings:[...new Set(warnings)],error,complete:!error};
}
