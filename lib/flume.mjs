import {G,geometry,calculate} from './hydraulics.mjs';
import {validateProject,buildSections,gradeAt,terrainAt,planAt,stationKey} from './project.mjs';
import {flowState,solveGVF} from './gvf.mjs';

const EPS=1e-7;
const failed=error=>({rows:[],warnings:[],error,complete:false});
function root(fn,lo,hi,tol=1e-10){
 let a=fn(lo),b=fn(hi);if(!Number.isFinite(a)||!Number.isFinite(b)||a*b>0)throw Error('No se pudo acotar la solución.');
 for(let i=0;i<100;i++){const mid=(lo+hi)/2,f=fn(mid);if(!Number.isFinite(f))throw Error('Resultado fuera del rango numérico.');if(Math.abs(f)<tol||hi-lo<1e-11)return mid;if(a*f<=0){hi=mid;b=f;}else{lo=mid;a=f;}}
 throw Error('No converge la solución.');
}
// All samples retain the original global alignment and original design anchors.
export function designSampler(d){
 const original=buildSections(d);
 return station=>{
  if(station<d.start-EPS||station>d.end+EPS)throw Error('La progresiva está fuera del alineamiento.');
  const exact=original.find(r=>r.key===stationKey(station));if(exact){const section={...exact.section,q:d.q};return {...exact,section,r:calculate(section)};}
  let i=0;while(i<original.length-2&&original[i+1].station<station)i++;
  const a=original[i],b=original[i+1],t=(station-a.station)/(b.station-a.station),grade=gradeAt(d,station),section={...a.section,q:d.q,s:grade.slope};
  for(const k of ['b','z','n','height','freeboard','vmin','vmax'])section[k]=a.section[k]+(b.section[k]-a.section[k])*t;
  const ground=terrainAt(d.profile,station);
  return {...a,station,key:stationKey(station),origins:['fgv'],addedBy:'fgv',section,r:calculate(section),invert:grade.invert,slope:grade.slope,ground,groundMinusInvert:ground===null?null:ground-grade.invert,crown:grade.invert+section.height,plan:planAt(d,station),barriers:[],plate:null,insidePlate:null,custom:false,side:'',slopeBefore:null,slopeAfter:null};
 };
}
export function weirBoundary(d,which,sample=designSampler(d)){
 const w=d.flume[which],row=sample(w.approach),crestRow=sample(w.station);
 if(w.approach>w.station+EPS)throw Error('La aproximación debe ubicarse aguas arriba de su barraje.');
 if(!w.free)throw Error('El rebose sumergido requiere una condición de descarga adicional. No se utiliza la ley de rebose libre.');
 if(w.height>crestRow.section.height)throw Error('La cresta supera la altura del canal.');
 const head=(3*d.q/(2*w.cd*w.width*Math.sqrt(2*G)))**(2/3),crest=crestRow.invert+w.height,water=crest+head,y=water-row.invert;
 if(!(y>0))throw Error('El nivel de aproximación queda bajo el fondo: revisa la progresiva y la altura del barraje.');
 const state=flowState(row.section,row.invert,y);
 return {station:w.approach,plateStation:w.station,crest,head,...state,approachRatio:state.vhead/head,assumption:which==='inlet'?'V₀ ≈ 0; carga cinética de aproximación omitida.':'Rebose libre con velocidad de aproximación despreciada; comprobar carga cinética/carga de rebose.'};
}
export function entryResult(d,sample=designSampler(d)){
 const p0=weirBoundary(d,'inlet',sample),e=d.flume.entry;
 if(e.mode==='impact')return {p0,p1:null,error:'Salto en la zona de impacto: no existe un punto 1 hidrostático independiente. Requiere datos medidos o un modelo de impacto y salto acoplados.'};
 if(e.station<d.flume.inlet.station+d.flume.inlet.thickness-EPS||e.station>=d.flume.outlet.approach)throw Error('P1 debe estar después de la lámina de entrada y antes de P4.');
 const row=sample(e.station),yc=row.r.yc,minEnergy=flowState(row.section,row.invert,yc).egl;
 const available=p0.water-e.loss;
 let y=e.depth;
 if(e.mode==='energy'){
  if(available<=minEnergy)throw Error('La energía disponible no supera la energía mínima: no hay raíz supercrítica independiente para P1.');
  y=root(y=>flowState(row.section,row.invert,y).egl-available,Math.max(1e-10,yc*1e-7),yc*(1-1e-8));
 }
 const state=flowState(row.section,row.invert,y);
 if(state.fr<=1)throw Error('El tirante de P1 no es supercrítico. Revisa el dato o selecciona salto en el impacto.');
 const inferredLoss=p0.water-state.egl;
 if(inferredLoss < -1e-7)throw Error('El tirante medido implica una ganancia de energía respecto a P0. Revisa los datos.');
 return {p0,p1:{station:e.station,invert:row.invert,...state,source:e.mode,loss:e.mode==='energy'?e.loss:inferredLoss,residual:e.mode==='energy'?Math.abs(state.egl-available):null},error:''};
}
export function branchSolution(d,kind,sample=designSampler(d),extra=[]){
 const f=d.flume,c=f[kind],sub=kind==='sub',start=sub?f.outlet.approach:c.station,sign=sub?-1:1;
 const end=start+sign*(c.count-1)*c.interval,lo=Math.min(start,end),hi=Math.max(start,end);
 const warnings=[];
 if(start<d.start-EPS||start>d.end+EPS||end<d.start-EPS||end>d.end+EPS)return failed('La extensión N/X sale del alineamiento. Ajusta N o X; no se recorta ni se reinicia la progresiva.');
 if(start<f.inlet.station+f.inlet.thickness-EPS||hi>f.outlet.approach+EPS||lo<f.inlet.station+f.inlet.thickness-EPS)return failed('La rama debe permanecer después de la lámina de entrada y hasta P4. Ajusta N, X o la progresiva inicial.');
 let boundary=null,error='';
 try{if(sub)boundary=weirBoundary(d,'outlet',sample);}catch(e){error=e.message;}
 const config={...d.gvf,regime:sub?'subcritical':'supercritical',boundary:'depth',depth:boundary?.y??c.depth??1,interval:c.interval};
 const points=new Map();
 function add(station,origin){if(station<lo-EPS||station>hi+EPS)return;const key=stationKey(station);if(!points.has(key))points.set(key,{station:Number(key),origins:[]});const p=points.get(key);if(!p.origins.includes(origin))p.origins.push(origin);}
 for(let i=0;i<c.count;i++)add(start+sign*i*c.interval,'fgv');
 // Keep all original design nodes, plate faces, and breaks within this reach.
 for(const r of buildSections(d))for(const origin of r.origins)add(r.station,origin);
 for(const station of extra)add(station,'jump');
 const nodes=[...points.values()].sort((a,b)=>a.station-b.station).map(p=>{
  const row=sample(p.station);return {...row,...p,addedBy:p.origins[0],section:{...row.section,gvf:config},origins:p.origins};
 });
 const meta={requested:c.count,regularEnd:end,start,interval:c.interval,regime:config.regime};
 if(error)return {...meta,...failed(error),rows:nodes.map(r=>({...r,state:null,status:'Sin calcular',dx:null,hf:null,hl:null,bedSlope:null}))};
 const result=solveGVF(d,nodes);
 if(boundary){warnings.push(boundary.assumption);if(boundary.approachRatio>.05)warnings.push('La carga cinética de aproximación supera el 5 % de H. El 5 % es una alerta orientativa, no una validación del coeficiente: revisa/calibra la ley de descarga.');}
 return {...result,...meta,warnings:[...result.warnings,...warnings]};
}
export function specificForce(section,y){
 const a=geometry(section,y);return section.q**2/(G*a.area)+a.b*y*y/2+a.z*y**3/3;
}
export function conjugateDepth(section,y){
 const yc=calculate(section).yc;if(y>=yc)throw Error('El tirante de entrada al salto debe ser supercrítico.');
 const m=specificForce(section,y);let hi=Math.max(yc*2,section.height);
 while(specificForce(section,hi)<m&&hi<1e6)hi*=2;
 return root(depth=>specificForce(section,depth)-m,yc*(1+1e-8),hi,Math.max(1e-16,m*1e-12));
}
function stateAt(solution,x){
 // For locating a candidate only. Final P2/P3 are recomputed by the FGV solver.
 const rows=solution.rows,exact=rows.find(r=>Math.abs(r.station-x)<1e-7);
 if(exact)return exact.state?exact:null;
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];if(x>a.station&&x<b.station){if(!a.state||!b.state||a.insidePlate||b.insidePlate)return null;const t=(x-a.station)/(b.station-a.station),y=a.state.y+(b.state.y-a.state.y)*t;return {...a,station:x,invert:a.invert+(b.invert-a.invert)*t,state:{...a.state,y}};}}
 return null;
}
export function jumpResult(d,superBranch,subBranch,sample=designSampler(d)){
 if(d.flume.jump.lengthMethod==='elevatorski')return conjugateJump(d,superBranch,subBranch,sample);
 const c=d.flume.jump,L=c.length,force=c.forceMode==='specified'?c.force:0;
 const result={complete:false,error:'',candidates:[],p2:null,p3:null};
 if(c.forceMode==='neglect'&&!c.acceptNeglect)return {...result,error:'Define la fuerza externa neta o declara aplicable la aproximación que desprecia peso y fricción en el salto. La igualdad de fuerzas específicas no es universal para un tramo de longitud finita.'};
 if(d.flume.entry.mode==='impact')return {...result,error:'El salto en el impacto no se localiza mediante dos ramas hidrostáticas independientes.'};
 if(!superBranch.rows.length||!subBranch.rows.length)return {...result,error:'Genera ambas ramas FGV para buscar el salto.'};
 const left=Math.max(superBranch.rows[0].station,subBranch.rows[0].station-L),right=Math.min(superBranch.rows.at(-1).station,subBranch.rows.at(-1).station-L);
 if(left>right)return {...result,error:'No hay cobertura común para P2 y P3 = P2 + Lj. Amplía las ramas o revisa Lj.'};
 function pair(x,exact=false){
  let a,b;
  if(exact){a=branchSolution(d,'super',sample,[x]).rows.find(r=>r.key===stationKey(x));b=branchSolution(d,'sub',sample,[x+L]).rows.find(r=>r.key===stationKey(x+L));}
  else{a=stateAt(superBranch,x);b=stateAt(subBranch,x+L);}
  if(!a?.state||!b?.state||a.state.fr<=1||b.state.fr>=1)return null;
  const sa=sample(x),sb=sample(x+L);
  // No uncontrolled transitions or controls are allowed inside the jump reach.
  if(d.barriers.some(w=>w.station<=x+L+EPS&&w.station+w.thickness>=x-EPS))return null;
  const interior=buildSections(d).filter(r=>r.station>x&&r.station<x+L);
  if([sb,...interior].some(r=>r.section.section!==sa.section.section||Math.abs(r.section.b-sa.section.b)>1e-8||Math.abs(r.section.z-sa.section.z)>1e-8))return null;
  const m2=specificForce(sa.section,a.state.y),m3=specificForce(sb.section,b.state.y);
  return {x2:x,x3:x+L,y2:a.state.y,y3:b.state.y,m2,m3,residual:m3-m2-force,scale:Math.max(m2,m3,1e-12),p2:{...sa,state:flowState(sa.section,sa.invert,a.state.y)},p3:{...sb,state:flowState(sb.section,sb.invert,b.state.y)}};
 }
 const found=[];
 if(c.mode==='manual'){
  if(c.station<left-EPS||c.station>right+EPS)return {...result,error:'P2/P3 están fuera de la cobertura calculada de las ramas.'};
  const p=pair(c.station,true);if(p)found.push(p);
 }else{
  const xs=[...new Set([left,right,...superBranch.rows.map(r=>r.station),...subBranch.rows.map(r=>r.station-L)].filter(x=>x>=left&&x<=right))].sort((a,b)=>a-b);
  let previous=null;
  for(const x of xs){const current=pair(x);if(!current){previous=null;continue;}
   if(Math.abs(current.residual)/current.scale<1e-7){const p=pair(x,true);if(p&&Math.abs(p.residual)/p.scale<1e-5)found.push(p);}
   if(previous&&previous.residual*current.residual<0){
    // Recalculate exact FGV states at both endpoints and at every trial station.
    let lo=previous.x2,hi=x,a=pair(lo,true),b=pair(hi,true);
    if(a&&b&&a.residual*b.residual<=0){let p=null;for(let i=0;i<45;i++){const mid=(lo+hi)/2;p=pair(mid,true);if(!p)break;if(Math.abs(p.residual)/p.scale<1e-6||hi-lo<1e-6)break;if(a.residual*p.residual<=0){hi=mid;b=p;}else{lo=mid;a=p;}}if(p&&Math.abs(p.residual)/p.scale<1e-5)found.push(p);}
   }previous=current;
  }
 }
 const unique=found.filter((p,i)=>!found.slice(0,i).some(a=>Math.abs(a.x2-p.x2)<1e-4));
 if(!unique.length)return {...result,error:'No se encontró compatibilidad de cantidad de movimiento en la cobertura disponible. Revisa contornos, Lj, fuerzas externas, geometría y longitud de las ramas.'};
 if(unique.length>1)return {...result,candidates:unique.map(p=>p.x2),error:'Hay varias ubicaciones compatibles. Selecciona P2 manualmente y verifica su estabilidad y las condiciones del experimento.'};
 const p=unique[0],loss=p.p2.state.egl-p.p3.state.egl,relative=Math.abs(p.residual)/p.scale;
 const compatible=relative<=1e-5&&loss>0;
 const yc=sample(p.x2).r.yc;
 return {...result,...p,complete:compatible,error:compatible?'':relative>1e-5?'P2 manual no satisface el balance de cantidad de movimiento.':'Los estados no producen una pérdida positiva de energía.',relative,loss,conjugate:conjugateDepth(p.p2.section,p.y2),yc,force,method:c.forceMode==='specified'?'M₃ − M₂ = F externa neta/(ρg), fuerza definida por el usuario.':'M₃ = M₂; peso y fricción despreciados por declaración del usuario.',length:L};
}
// Locate P2 by depth compatibility at the displaced section P3, never at P2.
// Scanning uses interpolation only to bracket; every accepted end state is
// recalculated with standard-step FGV on the unchanged global alignment.
export function conjugateJump(d,upper,lower,sample=designSampler(d)){
 const c=d.flume.jump,tolerance=1e-6,coefficient=6.9;
 const result={complete:false,error:'',candidates:[],p2:null,p3:null,lengthMethod:'elevatorski',tolerance,coefficient,trace:[]};
 if(d.section!=='rectangular')return {...result,error:'Lj = 6.9(y conjugado − y2) se ofrece solo para salto clásico rectangular. Para otra geometría utiliza longitud medida y un balance de fuerzas justificado.'};
 if(!c.acceptNeglect)return {...result,error:'Declara aplicables las hipótesis del salto clásico: sección rectangular prismática, pendiente suficientemente pequeña y peso/fricción despreciables en el salto.'};
 if(d.flume.entry.mode==='impact')return {...result,error:'El salto directo en el impacto requiere un modelo acoplado; no se localiza mediante estas dos curvas FGV.'};
 if(!upper.rows.some(r=>r.state)||!lower.rows.some(r=>r.state))return {...result,error:'Se necesitan tramos calculados en ambas curvas FGV para ubicar P2 y P3.'};
 const design=buildSections(d),left=upper.rows[0].station,right=Math.min(upper.rows.at(-1).station,lower.rows.at(-1).station);
 const coverage={superStart:left,superEnd:upper.rows.at(-1).station,subStart:lower.rows[0].station,subEnd:lower.rows.at(-1).station};
 const cache=new Map(),trace=[];let missingCoverage=0,invalidGeometry=0;
 function pair(station,exact=false){
  const x2=Number(stationKey(station)),key=stationKey(x2);
  if(exact&&cache.has(key))return cache.get(key);
  const a=exact?branchSolution(d,'super',sample,[x2]).rows.find(r=>r.key===key):stateAt(upper,x2);
  if(!a?.state)return null;
  const sa=sample(x2),s2=flowState(sa.section,sa.invert,a.state.y);
  if(s2.fr<=1||sa.section.section!=='rectangular')return null;
  const conjugate=conjugateDepth(sa.section,s2.y),length=coefficient*(conjugate-s2.y),x3=x2+length;
  if(x3>coverage.subEnd+EPS||x3<coverage.subStart-EPS){missingCoverage++;return null;}
  const sb=sample(x3),interior=design.filter(r=>r.station>x2&&r.station<x3);
  if([sb,...interior].some(r=>r.section.section!=='rectangular'||Math.abs(r.section.b-sa.section.b)>1e-8)||d.barriers.some(w=>w.station<=x3+EPS&&w.station+w.thickness>=x2-EPS)){invalidGeometry++;return null;}
  const b=exact?branchSolution(d,'sub',sample,[x3]).rows.find(r=>r.key===stationKey(x3)):stateAt(lower,x3);
  if(!b?.state)return null;
  const s3=flowState(sb.section,sb.invert,b.state.y);if(s3.fr>=1)return null;
  const m2=specificForce(sa.section,s2.y),m3=specificForce(sb.section,s3.y),depthResidual=s3.y-conjugate;
  const p={x2,x3,y2:s2.y,y3:s3.y,conjugate,length,depthResidual,residual:m3-m2,m2,m3,relative:Math.abs(m3-m2)/Math.max(m2,m3,1e-12),loss:s2.egl-s3.egl,p2:{...sa,state:s2},p3:{...sb,state:s3}};
  if(exact){cache.set(key,p);trace.push({x2,x3,y2:p.y2,conjugate,length,y3:p.y3,residual:depthResidual});}
  return p;
 }
 const found=[];let best=null;
 if(c.mode==='manual'){
  if(c.station<left-EPS||c.station>right+EPS)return {...result,coverage,error:'P2 está fuera de la rama supercrítica disponible.'};
  best=pair(c.station,true);if(best&&Math.abs(best.depthResidual)<=tolerance)found.push(best);
 }else{
  const nodes=[...new Set([left,right,...upper.rows.map(r=>r.station)].filter(x=>x>=left&&x<=right))].sort((a,b)=>a-b);
  const xs=[...nodes,...nodes.slice(1).map((x,i)=>(x+nodes[i])/2)].sort((a,b)=>a-b);
  let previous=null;
  for(const x of xs){
   const current=pair(x);if(!current){previous=null;continue;}
   if(!best||Math.abs(current.depthResidual)<Math.abs(best.depthResidual))best=current;
   if(Math.abs(current.depthResidual)<=tolerance){const p=pair(x,true);if(p&&Math.abs(p.depthResidual)<=tolerance)found.push(p);}
   if(previous&&previous.depthResidual*current.depthResidual<0){
    let lo=previous.x2,hi=current.x2,a=pair(lo,true),b=pair(hi,true);
    if(a&&b&&a.depthResidual*b.depthResidual<=0){
     let p=Math.abs(a.depthResidual)<Math.abs(b.depthResidual)?a:b;
     for(let i=0;i<50&&Math.abs(p.depthResidual)>tolerance;i++){
      const mid=Number(stationKey((lo+hi)/2));if(mid<=lo||mid>=hi)break;
      p=pair(mid,true);if(!p)break;
      if(a.depthResidual*p.depthResidual<=0){hi=mid;b=p;}else{lo=mid;a=p;}
     }
     if(p&&Math.abs(p.depthResidual)<=tolerance)found.push(p);
    }
   }
   previous=current;
  }
 }
 // Adjacent accepted scan points in a flat, tolerance-wide crossing form one
 // candidate. Separate roots remain separate and are never chosen arbitrarily.
 const unique=[];
 for(const p of found.sort((a,b)=>a.x2-b.x2)){
  const last=unique.at(-1);if(last&&Math.abs(last.x2-p.x2)<1e-4){if(Math.abs(p.depthResidual)<Math.abs(last.depthResidual))unique[unique.length-1]=p;}else unique.push(p);
 }
 if(unique.length>1)return {...result,coverage,trace,candidates:unique.map(p=>p.x2),error:'Varias posiciones satisfacen la coincidencia. Comprueba P2 manualmente y evalúa estabilidad y sensibilidad a X.'};
 const p=unique[0]??(best?pair(best.x2,true):null);
 if(!p)return {...result,coverage,trace,error:missingCoverage?'Cobertura FGV insuficiente para P3 = P2 + Lj. Extiende la rama subcrítica hacia aguas arriba y/o la supercrítica hacia aguas abajo, sin salir del alineamiento.':invalidGeometry?'El salto atraviesa un cambio de ancho o un barraje: la correlación clásica requiere un tramo prismático sin controles.':'No hay pares P2/P3 calculados y válidos en las dos curvas.'};
 const complete=!!unique.length&&p.loss>0;
 return {...result,...p,coverage,trace,complete,force:0,method:'Elevatorski: Lj = 6.9(y conjugado − y2); búsqueda desde aguas arriba de R(x2) = y subcrítico(x2 + Lj) − y conjugado. Salto clásico rectangular, peso y fricción despreciados por declaración del usuario.',error:complete?'':p.loss<=0?'La pareja propuesta no produce pérdida positiva de energía.':'No hay coincidencia dentro de la tolerancia de tirantes. Revisa cobertura, contornos y sensibilidad a X.'};
}
export function solveFlume(input){
 let d,sample;
 try{d=validateProject(input);sample=designSampler(d);}catch(e){return {error:e.message,entry:{p0:null,p1:null,error:e.message},outlet:null,super:failed(e.message),sub:failed(e.message),jump:{complete:false,error:e.message,p2:null,p3:null},profile:failed(e.message)};}
 let entry,outlet=null,outletError='';
 try{entry=entryResult(d,sample);}catch(e){let p0=null;try{p0=weirBoundary(d,'inlet',sample);}catch{}entry={p0,p1:null,error:e.message};}
 try{outlet=weirBoundary(d,'outlet',sample);}catch(e){outletError=e.message;}
 const safeBranch=kind=>{try{return branchSolution(d,kind,sample);}catch(e){return failed(e.message);}};
 const superBranch=safeBranch('super'),subBranch=safeBranch('sub');
 const jump=jumpResult(d,superBranch,subBranch,sample);
 let upper=superBranch,lower=subBranch;
 if(jump.complete){upper=branchSolution(d,'super',sample,[jump.x2]);lower=branchSolution(d,'sub',sample,[jump.x3]);}
 const physical=jump.complete?[...upper.rows.filter(r=>r.station<=jump.x2+EPS),...lower.rows.filter(r=>r.station>=jump.x3-EPS)]:[];
 // A gap separates the rapidly varied jump from both FGV reaches.
 if(jump.complete&&jump.x3-jump.x2>1e-6){const row=sample((jump.x2+jump.x3)/2);physical.push({...row,key:'jump-gap',state:null,status:'Salto · sin FGV',dx:null,hf:null,hl:null,bedSlope:null});}
 return {error:'',entry,outlet,outletError,super:upper,sub:lower,jump,profile:{rows:physical.map((r,i)=>({...r,key:r.key+":"+i})).sort((a,b)=>a.station-b.station),complete:jump.complete,error:jump.error,warnings:[]}};
}
