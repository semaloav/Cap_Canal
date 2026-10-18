"use client";
import {Plus,Trash2,Waves,AlertTriangle} from "lucide-react";
import {newBarrier,barrierRating} from "../lib/barriers.mjs";
import {stationLabel,stationKey,gradeAt} from "../lib/project.mjs";
import {NumberInput,StationInput,fmt} from "./engineering-views";
import type {Project,Barrier} from "./types";
export function BarrierDiagram({a,section,invert=0}:{a:Barrier;section:Project;invert?:number}){
 const b=section.section==="triangular"?0:section.b,z=section.section==="rectangular"?0:section.z;
 const top=Math.max(section.height,a.crest,a.analysis?a.upstream:0,a.analysis?a.downstream:0,.01)*1.15,span=Math.max(b+2*z*top,.1),scale=Math.min(280/span,190/top),cx=190,base=250,Y=(v:number)=>base-v*scale,L=(v:number)=>cx-(b/2+z*v)*scale,R=(v:number)=>cx+(b/2+z*v)*scale;
 const gap=a.mode==="underflow"?a.opening:0,valid=[a.thickness,a.crest,gap].every(Number.isFinite)&&a.crest>gap&&gap>=0;
 if(!valid)return <div className="chart-empty">Completa las dimensiones de la lámina.</div>;
 const plate=[[L(a.crest),Y(a.crest)],[R(a.crest),Y(a.crest)],[R(gap),Y(gap)],[L(gap),Y(gap)]].map(p=>p.join(",")).join(" ");
 const sideX=545,sideScale=185/top,sideY=(v:number)=>250-v*sideScale,displayT=Math.max(5,Math.min(30,a.thickness*sideScale)),up=a.analysis?a.upstream:0,down=a.analysis?a.downstream:0;
 return <svg className="barrier-diagram" viewBox="0 0 780 335" role="img" aria-label="Lámina de barraje, vista frontal y lateral, cresta, abertura y espesor">
 <text x="35" y="24" className="svg-label">VISTA FRONTAL · {stationLabel(a.station)}</text><text x="425" y="24" className="svg-label">VISTA LATERAL · FLUJO →</text>
 <polyline points={[[L(section.height),Y(section.height)],[cx-b/2*scale,250],[cx+b/2*scale,250],[R(section.height),Y(section.height)]].map(p=>p.join(",")).join(" ")} fill="none" stroke="#25485b" strokeWidth="4"/>
 {up>0&&<polygon points={[[L(up),Y(up)],[R(up),Y(up)],[cx+b/2*scale,250],[cx-b/2*scale,250]].map(p=>p.join(",")).join(" ")} fill="#54b8cc" fillOpacity=".16"/>}
 <polygon points={plate} fill="#c59a5c" fillOpacity=".7" stroke="#947042" strokeWidth="2"/>
 <line x1={L(a.crest)-10} y1={Y(a.crest)} x2={R(a.crest)+10} y2={Y(a.crest)} stroke="#b6833b" strokeDasharray="4 3"/>
 <text x="190" y="286" textAnchor="middle" className="svg-label">P = {fmt(a.crest,4)} m · a = {fmt(gap,4)} m</text>
 <text x="190" y="309" textAnchor="middle" className="svg-small">Cresta: {fmt(invert+a.crest,4)} m · borde inferior: {fmt(invert+gap,4)} m</text>
 <line x1="415" x2="750" y1="250" y2="250" stroke="#25485b" strokeWidth="4"/>
 {up>0&&<rect x="415" y={sideY(up)} width={sideX-415} height={250-sideY(up)} fill="#57b8c9" fillOpacity=".25"/>}
 {down>0&&<rect x={sideX+displayT} y={sideY(down)} width={750-sideX-displayT} height={250-sideY(down)} fill="#57b8c9" fillOpacity=".25"/>}
 <rect x={sideX} y={sideY(a.crest)} width={displayT} height={(a.crest-gap)*sideScale} fill="#b58a4f" stroke="#8c6a39" strokeWidth="1.5"/>
 {up>0&&<line x1="415" x2={sideX} y1={sideY(up)} y2={sideY(up)} stroke="#1b9db4" strokeWidth="2"/>}
 {down>0&&<line x1={sideX+displayT} x2="750" y1={sideY(down)} y2={sideY(down)} stroke="#1b9db4" strokeWidth="2"/>}
 <text x="590" y="286" textAnchor="middle" className="svg-label">Espesor t = {fmt(a.thickness,4)} m</text><text x="590" y="309" textAnchor="middle" className="svg-small">Espesor ampliado para visualizar · niveles ingresados</text>
 {a.analysis&&<><text x="425" y={Math.max(46,sideY(up)-10)} className="svg-small">y₁ = {fmt(up,3)} m</text><text x="680" y={Math.max(46,sideY(down)-10)} className="svg-small">y₂ = {fmt(down,3)} m</text></>}
 </svg>;
}
export function BarrierResults({a,section}:{a:Barrier;section:Project}){
 const v=barrierRating(a,section);if(!a.analysis)return null;
 return <div className="barrier-evaluation"><div className="barrier-regime"><Waves size={16}/>{v.regime}</div>
 <div className="barrier-metrics">{[["Rebose por cresta",v.over,"m³/s"],["Paso inferior",v.under,"m³/s"],["Total evaluado",v.total,"m³/s"],["Carga sobre cresta",v.crestHead,"m"]].map(([k,n,u])=><div key={String(k)}><small>{k}</small><strong>{fmt(n as number|null,5)} <em>{u}</em></strong></div>)}</div>
 {v.total!==null&&<p className="hint">Caudal de diseño en esta progresiva: {fmt(section.q,5)} m³/s. Diferencia Q evaluado − Q diseño: {fmt(v.total-section.q,5)} m³/s. El nivel necesario para conducir Q se resuelve en Perfil FGV.</p>}
 {v.warnings.map(w=><div className="barrier-warning" key={w}><AlertTriangle size={13}/><span>{w}</span></div>)}
 </div>;
}
export default function BarrierEditor({d,onChange}:{d:Project;onChange:(barriers:Barrier[])=>void}){
 function edit(id:string,patch:Partial<Barrier>){onChange(d.barriers.map(a=>a.id===id?{...a,...patch}:a));}
 return <section className="panel barriers-panel" id="barriers-panel"><div className="panel-title"><LayersIcon/><h2>Barrajes de lámina transversal</h2><button className="primary" disabled={d.barriers.length>=20||!Number.isFinite(d.start)||!Number.isFinite(d.end)} onClick={()=>{const a=newBarrier(Number((d.start+(d.end-d.start)*(d.barriers.length+1)/(d.barriers.length+2)).toFixed(6))) as Barrier;a.name="Barraje "+String(d.barriers.length+1).padStart(2,"0");a.crest=Math.min(.4,d.height*.6);onChange([...d.barriers,a]);}}><Plus size={14}/> Añadir barraje</button></div>
 <div className="barrier-intro"><p>Lámina vertical que atraviesa la sección del canal: puede apoyarse en el fondo o dejar una abertura por debajo. Define su progresiva, espesor y alturas; no requiere especificar un cuerpo de concreto.</p><p className="hint">Ubicación = cara aguas arriba. P = cresta sobre el fondo; a = abertura bajo la lámina; altura de la lámina = P − a. El espesor t se mide en el sentido del flujo.</p></div>
 {!d.barriers.length&&<div className="chart-empty">Aún no hay barrajes. Añade una lámina para configurar rebose o paso inferior.</div>}
 {d.barriers.map((a,i)=>{
  const patch=d.overrides[stationKey(Number.isFinite(a.station)?a.station:0)]??{},local={...d,...patch} as Project;
  let invert=0;try{invert=gradeAt(d,a.station).invert;}catch{}
  return <article className="barrier-card" key={a.id}><div className="barrier-card-header"><span className="step">B{String(i+1).padStart(2,"0")}</span><strong>{a.name}</strong><button className="icon-btn" aria-label={"Eliminar "+a.name} onClick={()=>{if(window.confirm("¿Eliminar este barraje?"))onChange(d.barriers.filter(b=>b.id!==a.id));}}><Trash2 size={15}/></button></div>
 <div className="barrier-editor-grid"><div className="barrier-fields">
 <label className="field"><span>Nombre</span><input maxLength={120} value={a.name} onChange={e=>edit(a.id,{name:e.target.value})}/></label>
 <StationInput value={a.station} label="Ubicación por progresiva" onChange={v=>edit(a.id,{station:v})}/>
 <label className="field"><span>Configuración de la lámina</span><select value={a.mode} onChange={e=>edit(a.id,{mode:e.target.value as Barrier["mode"],opening:e.target.value==="crest"?0:Math.min(.1,a.crest*.3)})}><option value="crest">Apoyada en el fondo · rebose por cresta</option><option value="underflow">Levantada · abertura inferior</option></select></label>
 <div className="two-cols"><NumberInput label="Espesor · t" unit="m" value={a.thickness} onChange={v=>edit(a.id,{thickness:v})}/><NumberInput label="Altura de cresta · P" unit="m sobre fondo" value={a.crest} onChange={v=>edit(a.id,{crest:v})}/>{a.mode==="underflow"&&<NumberInput label="Abertura inferior · a" unit="m sobre fondo" value={a.opening} onChange={v=>edit(a.id,{opening:v})}/>}</div>
 <div className="two-cols"><NumberInput label="Cd de rebose (FGV y local)" value={a.cdWeir} onChange={v=>edit(a.id,{cdWeir:v})}/>{a.mode==="underflow"&&<NumberInput label="Cd de orificio (FGV y local)" value={a.cdOrifice} onChange={v=>edit(a.id,{cdOrifice:v})}/>}</div>
 <label className="field"><span>Observaciones de la lámina</span><textarea rows={2} maxLength={2000} value={a.notes} onChange={e=>edit(a.id,{notes:e.target.value})}/></label>
 </div><div className="barrier-visual"><BarrierDiagram a={a} section={local} invert={invert}/><div className="small-note">Si la lámina deja una abertura y el agua supera su cresta, puede haber rebose y paso inferior simultáneamente. Ambos se representan en el análisis local.</div></div></div>
 <div className="barrier-analysis"><label className="analysis-switch"><input type="checkbox" checked={a.analysis} onChange={e=>edit(a.id,{analysis:e.target.checked})}/><strong>Evaluación hidráulica local con niveles ingresados</strong><span>Opcional</span></label>
 {a.analysis&&<><div className="barrier-analysis-inputs"><NumberInput label="Tirante manual aguas arriba" unit="m" value={a.upstream} onChange={v=>edit(a.id,{upstream:v})}/><NumberInput label="Tirante manual aguas abajo" unit="m" value={a.downstream} onChange={v=>edit(a.id,{downstream:v})}/></div>
 <p className="hint">Coeficientes iniciales de ejemplo: deben elegirse o calibrarse para la geometría, el borde y las condiciones de descarga. Se desprecia la velocidad de aproximación. El espesor se conserva geométricamente; no se calcula una corrección por cresta gruesa.</p>
 {[a.upstream,a.downstream,a.crest,a.opening,a.cdWeir,a.cdOrifice].every(Number.isFinite)&&<BarrierResults a={a} section={local}/>}
 </>}
 <p className="barrier-scope">Este barraje modifica el nivel de agua en Perfil FGV. Se calcula el nivel aguas arriba a partir del caudal y del nivel aguas abajo del perfil. La evaluación manual opcional es una comprobación independiente y sus niveles no alimentan FGV.</p>
 </div></article>;
 })}
 </section>;
}
function LayersIcon(){return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 16H17M8 3V16M12 3V12" stroke="#987344" strokeWidth="2"/><path d="M2 8H7M13 14H18" stroke="#139bae" strokeWidth="1.5"/></svg>;}
