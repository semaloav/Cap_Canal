const key=s=>String(Number(s.toFixed(6)));
export const originLabels={base:"Base",fgv:"Intervalo X FGV",grade:"Cambio de pendiente",barrierUp:"Barraje · aguas arriba",barrierDown:"Barraje · aguas abajo",terrain:"Punto de terreno",plan:"Quiebre en planta",adaptive:"Refinamiento FGV",jump:"Punto del salto"};
export function regularStations(d,interval=d.step){
 if(!Number.isFinite(interval)||interval<1e-6||!Number.isFinite(d.start)||!Number.isFinite(d.end)||d.end<=d.start)throw Error("Define longitud e intervalo positivos para generar las secciones.");
 const count=Math.floor((d.end-d.start)/interval+1e-9);
 if(count>10000)throw Error("El intervalo genera más de 10000 secciones. Aumenta X.");
 return [...new Set([d.start,d.end,...Array.from({length:count},(_,i)=>d.start+(i+1)*interval)].filter(s=>s<=d.end+1e-7).map(key))].map(Number).sort((a,b)=>a-b);
}
// Every regular design station survives. Additional reasons share a physical
// section when they coincide; no zero-length open-channel energy step is added.
export function sectionMesh(d,withFGV=false){
 const points=new Map();
 function add(station,origin){const k=key(station);if(!points.has(k))points.set(k,{station:Number(k),key:k,origins:[],addedBy:origin});const p=points.get(k);if(!p.origins.includes(origin))p.origins.push(origin);}
 regularStations(d).forEach(s=>add(s,"base"));
 if(withFGV)regularStations(d,d.gvf.interval).forEach(s=>add(s,"fgv"));
 d.grades.slice(0,-1).forEach((a,i)=>{if(Math.abs(a.slope-d.grades[i+1].slope)>1e-12)add(a.end,"grade");});
 for(const a of d.barriers??[]){add(a.station,"barrierUp");add(a.station+a.thickness,"barrierDown");}
 d.profile.filter(p=>p.station>=d.start&&p.station<=d.end).forEach(p=>add(p.station,"terrain"));
 if(d.planEnabled)d.plan.slice(0,-1).forEach(a=>add(a.end,"plan"));
 return [...points.values()].sort((a,b)=>a.station-b.station).map(p=>{
  const ups=(d.barriers??[]).filter(a=>key(a.station)===p.key),downs=(d.barriers??[]).filter(a=>key(a.station+a.thickness)===p.key);
  const inside=(d.barriers??[]).find(a=>p.station>Number(key(a.station))&&p.station<Number(key(a.station+a.thickness)));
  const breakIndex=d.grades.findIndex((a,i)=>i<d.grades.length-1&&key(a.end)===p.key&&a.slope!==d.grades[i+1].slope);
  return {...p,plate:ups[0]??null,insidePlate:inside?.id??null,side:[...ups.map(()=>"Aguas arriba"),...downs.map(()=>"Aguas abajo")].join(" · "),slopeBefore:breakIndex>=0?d.grades[breakIndex].slope:null,slopeAfter:breakIndex>=0?d.grades[breakIndex+1].slope:null};
 });
}
export function meshSummary(rows){
 const count=type=>rows.filter(r=>r.addedBy===type).length;
 return {base:count("base"),fgvAdded:count("fgv"),gradeAdded:count("grade"),barrierAdded:count("barrierUp")+count("barrierDown"),otherAdded:count("terrain")+count("plan"),adaptiveAdded:count("adaptive"),total:rows.length,barrierFaces:rows.filter(r=>r.origins.includes("barrierUp")||r.origins.includes("barrierDown")).length,gradeBreaks:rows.filter(r=>r.origins.includes("grade")).length,insidePlate:rows.filter(r=>r.insidePlate).length};
}
