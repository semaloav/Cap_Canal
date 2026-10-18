"use client";
import {useEffect,useState} from "react";
import {Check,AlertTriangle} from "lucide-react";
import {discharge} from "../lib/hydraulics.mjs";
import {parseStation,stationLabel} from "../lib/project.mjs";
import type {Project,Hydro,SectionRow} from "./types";
export const fmt=(v:number|null|undefined,n=4)=>v===null||v===undefined||!Number.isFinite(v)?"—":v.toLocaleString("es-PE",{maximumFractionDigits:n});
export const labels:Record<string,string>={rectangular:"Rectangular",trapezoidal:"Trapezoidal",triangular:"Triangular"};
export function NumberInput({value,onChange,label,unit,disabled=false}:{value:number;onChange:(v:number)=>void;label:string;unit?:string;disabled?:boolean}){return <label className="field"><span>{label}<small>{unit}</small></span><input type="number" step="any" value={Number.isFinite(value)?value:""} disabled={disabled} onChange={e=>onChange(e.target.value===""?NaN:Number(e.target.value))}/></label>;}
export function StationInput({value,onChange,label}:{value:number;onChange:(v:number)=>void;label:string}){
 const [text,setText]=useState(Number.isFinite(value)?stationLabel(value):"");const [invalid,setInvalid]=useState(false);const [focused,setFocused]=useState(false);
 useEffect(()=>{if(!focused&&Number.isFinite(value)){setText(stationLabel(value));setInvalid(false);}},[value,focused]);
 return <label className="field"><span>{label}<small>km + m</small></span><input aria-invalid={invalid} value={text} onFocus={()=>setFocused(true)} onChange={e=>{setText(e.target.value);try{const s=parseStation(e.target.value);setInvalid(false);onChange(s);}catch{setInvalid(true);onChange(NaN);}}} onBlur={()=>{setFocused(false);if(Number.isFinite(value))setText(stationLabel(value));}}/>{invalid&&<small className="input-error">Usa 0+020.00 o metros.</small>}</label>;
}
export function Section({d,r}:{d:Project;r:Hydro}){
 const b=d.section==="triangular"?0:d.b,z=d.section==="rectangular"?0:d.z;
 const maxY=Math.max(d.height,r.yn*1.1),width=b+2*z*maxY,scale=Math.min(470/Math.max(width,.01),220/maxY);
 const cx=300,base=280,px=(x:number)=>cx+x*scale,py=(y:number)=>base-y*scale,left=(y:number)=>-b/2-z*y,right=(y:number)=>b/2+z*y;
 const points=(y:number)=>[[left(y),y],[-b/2,0],[b/2,0],[right(y),y]].map(([x,y])=>px(x)+","+py(y)).join(" ");
 return <svg className="section-svg" viewBox="0 0 600 355" role="img" aria-label="Sección transversal del canal, nivel de agua y altura de paredes">
 <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dce6ea" strokeWidth=".6"/></pattern><linearGradient id="water" x2="0" y2="1"><stop stopColor="#67cfdf" stopOpacity=".62"/><stop offset="1" stopColor="#1598ad" stopOpacity=".18"/></linearGradient></defs>
 <rect x="8" y="8" width="584" height="305" rx="12" fill="url(#grid)"/><line x1="32" y1={base} x2="568" y2={base} stroke="#a9bbc5" strokeDasharray="4 5"/>
 <polygon points={points(r.yn)} fill="url(#water)"/><polyline points={points(d.height)} fill="none" stroke="#284656" strokeWidth="5" strokeLinejoin="round"/>
 {r.yn>d.height&&<polyline points={points(r.yn)} fill="none" stroke="#cb7633" strokeWidth="2" strokeDasharray="6 5"/>}
 <line x1={px(left(r.yn))} x2={px(right(r.yn))} y1={py(r.yn)} y2={py(r.yn)} stroke="#009cb4" strokeWidth="2"/>
 <text x="25" y="35" className="svg-label">SECCIÓN TRANSVERSAL · m</text><text x={cx} y={Math.max(52,py(r.yn)-12)} textAnchor="middle" fill="#087e92" fontSize="13">T = {fmt(r.top,3)} m</text>
 <text x="566" y={py(r.yn/2)} textAnchor="end" className="svg-label">yₙ = {fmt(r.yn,3)} m</text><text x={cx} y="332" textAnchor="middle" className="svg-label">{b>0?"b = "+fmt(b,3)+" m":"Vértice de la sección"}{z>0?" · z = "+fmt(z,2)+" H : 1 V":""}</text></svg>;
}
export function Curve({d,r}:{d:Project;r:Hydro}){
 const maxY=Math.max(d.height,r.yn*1.25),maxQ=discharge(d,maxY),x=(q:number)=>48+q/maxQ*480,y=(v:number)=>185-v/maxY*155;
 const pts=Array.from({length:65},(_,i)=>{const yy=maxY*i/64;return x(discharge(d,yy))+","+y(yy);}).join(" ");
 return <svg viewBox="0 0 580 225" className="curve" role="img" aria-label="Curva caudal versus tirante">{[0,.25,.5,.75,1].map(t=><g key={t}><line x1="48" y1={y(maxY*t)} x2="528" y2={y(maxY*t)} stroke="#e1e9ed"/><text x="37" y={y(maxY*t)+4} textAnchor="end" className="svg-small">{fmt(maxY*t,2)}</text><text x={x(maxQ*t)} y="205" textAnchor="middle" className="svg-small">{fmt(maxQ*t,3)}</text></g>)}<polyline points={pts} fill="none" stroke="#008da1" strokeWidth="2.5"/><circle cx={x(d.q)} cy={y(r.yn)} r="5" fill="#e3a339" stroke="white" strokeWidth="2"/><text x="48" y="15" className="svg-small">Tirante (m)</text><text x="530" y="222" textAnchor="end" className="svg-small">Caudal (m³/s)</text></svg>;
}
export function ResultCards({r}:{r:Hydro}){
 const metrics=[["Tirante normal",r.yn,"m"],["Velocidad media",r.velocity,"m/s"],["Número de Froude",r.fr,r.regime],["Tirante crítico",r.yc,"m"]];
 return <div className="metrics">{metrics.map(([label,value,unit],i)=><div className="metric" key={label}><small>{label}</small><strong>{fmt(Number(value),4)}<span>{i===2?"":unit}</span></strong>{i===2&&<em>{unit}</em>}</div>)}</div>;
}
export function Review({r,d}:{r:Hydro;d:Project}){return <div className="checks">{[[r.capacityOk,"Altura y borde libre",fmt(r.remaining,3)+" m disponibles · "+fmt(d.freeboard,3)+" m requeridos"],[r.velocityOk,"Velocidad",fmt(d.vmin,2)+" ≤ V ≤ "+fmt(d.vmax,2)+" m/s · criterio del usuario"]].map(([ok,title,info])=><div className={ok?"check-row":"check-row warn"} key={String(title)}>{ok?<Check size={18}/>:<AlertTriangle size={18}/>}<div><strong>{title}</strong><p>{info}</p></div><span>{ok?"Cumple":"Revisar"}</span></div>)}</div>;}
export function LongProfile({rows,profile=[]}:{rows:SectionRow[];profile?:{station:number;ground:number}[]}){
 const plotted=rows.length?rows:profile.map(p=>({station:p.station,ground:p.ground,invert:null,water:null,crown:null}));
 if(!plotted.length)return <div className="chart-empty">Añade puntos de terreno para visualizar el perfil longitudinal.</div>;
 const barRows=rows.flatMap(row=>(row.barriers??[]).map(a=>({row,a})));
 const stations=plotted.map(p=>p.station),minS=Math.min(...stations),maxS=Math.max(...stations),vals=[...plotted.flatMap(p=>[p.ground,p.invert,p.water,p.crown]),...barRows.flatMap(({row,a})=>[row.invert+a.crest,row.invert+a.opening])].filter(v=>v!==null&&Number.isFinite(v)) as number[];
 if(!vals.length)return null;const low=Math.min(...vals),high=Math.max(...vals),span=Math.max(high-low,.5),minY=low-span*.12,maxY=high+span*.12,x=(s:number)=>65+(s-minS)/(maxS-minS||1)*760,y=(v:number)=>245-(v-minY)/(maxY-minY)*205;
 function paths(key:"ground"|"invert"|"water"|"crown"){let path="",pen=false;for(const p of plotted){const v=p[key];if(v===null||!Number.isFinite(v)){pen=false;continue;}path+=(pen?" L":" M")+x(p.station)+","+y(v);pen=true;}return path;}
 return <div className="long-profile"><svg viewBox="0 0 880 295" role="img" aria-label="Perfil longitudinal de terreno, fondo del canal, agua y coronación">
 {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="65" y1={245-t*205} x2="825" y2={245-t*205} stroke="#e1e9ed"/><text x="56" y={249-t*205} textAnchor="end" className="svg-small">{fmt(minY+(maxY-minY)*t,2)}</text><text x={65+760*t} y="266" textAnchor="middle" className="svg-small">{stationLabel(minS+(maxS-minS)*t)}</text></g>)}
 <path d={paths("ground")} fill="none" stroke="#a28757" strokeWidth="2"/><path d={paths("invert")} fill="none" stroke="#264c62" strokeWidth="2.5"/><path d={paths("water")} fill="none" stroke="#25a5bd" strokeWidth="1.5"/><path d={paths("crown")} fill="none" stroke="#8da5af" strokeWidth="1.5" strokeDasharray="6 4"/>
 {barRows.map(({row,a})=><g key={a.id}><line x1={x(row.station)} x2={x(row.station)} y1={y(row.invert+a.opening)} y2={y(row.invert+a.crest)} stroke="#b48b4f" strokeWidth="5"/><circle cx={x(row.station)} cy={y(row.invert+a.crest)} r="3" fill="#b48b4f"/><text x={x(row.station)+6} y={y(row.invert+a.crest)-7} className="svg-small" fill="#9b7948">{a.name}</text></g>)}
 <text x="65" y="20" className="svg-small">Cota (m) · exageración vertical variable</text><text x="826" y="288" className="svg-small" textAnchor="end">Progresiva</text></svg>
 <div className="legend"><span><i style={{background:"#a28757"}}/>Terreno</span><span><i className="wall"/>Fondo</span><span><i/>Agua (flujo uniforme local)</span><span>Coronación — —</span>{barRows.length>0&&<span className="barrier-legend"><i style={{background:"#b48b4f"}}/>Barraje de lámina</span>}</div></div>;
}
export function PlanView({rows}:{rows:SectionRow[]}){
 const points=rows.filter(r=>r.plan);if(points.length<2)return <div className="chart-empty">Activa la geometría en planta para visualizar el trazado.</div>;
 const east=points.map(r=>r.plan!.easting),north=points.map(r=>r.plan!.northing),minE=Math.min(...east),maxE=Math.max(...east),minN=Math.min(...north),maxN=Math.max(...north),scale=Math.min(620/(maxE-minE||1),200/(maxN-minN||1)),cx=(minE+maxE)/2,cy=(minN+maxN)/2,x=(v:number)=>380+(v-cx)*scale,y=(v:number)=>130-(v-cy)*scale;
 return <svg className="plan-view" viewBox="0 0 760 285" role="img" aria-label="Trazado en planta"><polyline points={points.map(r=>x(r.plan!.easting)+","+y(r.plan!.northing)).join(" ")} fill="none" stroke="#008b93" strokeWidth="3"/><circle cx={x(east[0])} cy={y(north[0])} r="5" fill="#dfa844"/><text x={x(east[0])+10} y={y(north[0])+18} className="svg-label">{stationLabel(points[0].station)}</text><circle cx={x(east.at(-1)!)} cy={y(north.at(-1)!)} r="4" fill="#142c3a"/><text x={x(east.at(-1)!)+10} y={y(north.at(-1)!)-10} className="svg-label">{stationLabel(points.at(-1)!.station)}</text><path d="M715 58V25m-5 8 5-8 5 8" stroke="#567380" fill="none"/><text x="715" y="18" textAnchor="middle" className="svg-label">N</text><text x="25" y="275" className="svg-small">Vista esquemática por secciones · coordenadas planas (m)</text></svg>;
}
