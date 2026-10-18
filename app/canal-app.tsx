"use client";
import {useState,useEffect,useMemo} from "react";
import {Plus,Save,Copy,Trash2,FileText,ChevronRight,Download,Upload,Waves,FolderOpen,Check,AlertTriangle,Search,ArrowUpRight,RefreshCw,X,Settings2,ChartNoAxesCombined} from "lucide-react";
import {defaults,calculate,discharge} from "../lib/hydraulics.mjs";
type Design=typeof defaults;
type RecordItem={id:string;design:Design;revision:number;updatedAt?:string};
const fresh=():RecordItem=>({id:crypto.randomUUID(),design:{...defaults},revision:0});
const fmt=(v:number,n=4)=>Number.isFinite(v)?v.toLocaleString("es-PE",{maximumFractionDigits:n}):"—";
const labels:Record<string,string>={rectangular:"Rectangular",trapezoidal:"Trapezoidal",triangular:"Triangular"};
function Section({d,r}:{d:Design;r:ReturnType<typeof calculate>}){
 const b=d.section==="triangular"?0:d.b,z=d.section==="rectangular"?0:d.z;
 const maxY=Math.max(d.height,r.yn*1.1),width=b+2*z*maxY;
 const scale=Math.min(470/Math.max(width,0.01),220/maxY);
 const cx=300,base=280,px=(x:number)=>cx+x*scale,py=(y:number)=>base-y*scale;
 const left=(y:number)=>-b/2-z*y,right=(y:number)=>b/2+z*y;
 const points=(y:number)=>[[left(y),y],[-b/2,0],[b/2,0],[right(y),y]].map(([x,y])=>px(x)+","+py(y)).join(" ");
 return <svg className="section-svg" viewBox="0 0 600 355" role="img" aria-label="Sección transversal del canal, nivel de agua y altura de paredes">
 <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#dce6ea" strokeWidth=".6"/></pattern><linearGradient id="water" x2="0" y2="1"><stop stopColor="#67cfdf" stopOpacity=".62"/><stop offset="1" stopColor="#1598ad" stopOpacity=".18"/></linearGradient></defs>
 <rect x="8" y="8" width="584" height="305" rx="12" fill="url(#grid)"/>
 <line x1="32" y1={base} x2="568" y2={base} stroke="#a9bbc5" strokeDasharray="4 5"/>
 <polygon points={points(r.yn)} fill="url(#water)"/>
 <polyline points={points(d.height)} fill="none" stroke="#284656" strokeWidth="5" strokeLinejoin="round"/>
 {r.yn>d.height&&<polyline points={points(r.yn)} fill="none" stroke="#cb7633" strokeWidth="2" strokeDasharray="6 5"/>}
 <line x1={px(left(r.yn))} x2={px(right(r.yn))} y1={py(r.yn)} y2={py(r.yn)} stroke="#009cb4" strokeWidth="2"/>
 <text x="25" y="35" className="svg-label">SECCIÓN TRANSVERSAL · m</text>
 <text x={cx} y={Math.max(52,py(r.yn)-12)} textAnchor="middle" fill="#087e92" fontSize="13">T = {fmt(r.top,3)} m</text>
 <text x="566" y={py(r.yn/2)} textAnchor="end" className="svg-label">yₙ = {fmt(r.yn,3)} m</text>
 <text x={cx} y="332" textAnchor="middle" className="svg-label">{b>0?"b = "+fmt(b,3)+" m":"Vértice de la sección"}{z>0?" · z = "+fmt(z,2)+" H : 1 V":""}</text>
 </svg>;
}
function Curve({d,r}:{d:Design;r:ReturnType<typeof calculate>}){
 const maxY=Math.max(d.height,r.yn*1.25),maxQ=discharge(d,maxY);
 const x=(q:number)=>48+q/maxQ*480,y=(v:number)=>185-v/maxY*155;
 const pts=Array.from({length:65},(_,i)=>{const yy=maxY*i/64;return x(discharge(d,yy))+","+y(yy);}).join(" ");
 return <svg viewBox="0 0 580 225" className="curve" role="img" aria-label="Curva de capacidad, caudal versus tirante">
 {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="48" y1={y(maxY*t)} x2="528" y2={y(maxY*t)} stroke="#e1e9ed"/><text x="37" y={y(maxY*t)+4} textAnchor="end" className="svg-small">{fmt(maxY*t,2)}</text><text x={x(maxQ*t)} y="205" textAnchor="middle" className="svg-small">{fmt(maxQ*t,3)}</text></g>)}
 <polyline points={pts} fill="none" stroke="#008da1" strokeWidth="2.5"/><circle cx={x(d.q)} cy={y(r.yn)} r="5" fill="#e3a339" stroke="white" strokeWidth="2"/>
 <text x="48" y="15" className="svg-small">Tirante (m)</text><text x="530" y="222" textAnchor="end" className="svg-small">Caudal (m³/s)</text>
 </svg>;
}
export default function CanalApp(){
 const [current,setCurrent]=useState<RecordItem|null>(null),[records,setRecords]=useState<RecordItem[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[search,setSearch]=useState(""),[tab,setTab]=useState("design"),[reportDate,setReportDate]=useState("");
 useEffect(()=>{setCurrent(fresh());setReportDate(new Date().toLocaleString("es-PE"));load();},[]);
 async function load(){setLoading(true);setError("");try{const res=await fetch("/api/designs",{cache:"no-store"});const data=await res.json() as RecordItem[] & {error?:string};if(!res.ok)throw Error(data.error);setRecords(data);}catch(e){setError(e instanceof Error?e.message:"No se pudo conectar.");}finally{setLoading(false);}}
 const d=current?.design??defaults;
 const result=useMemo(()=>{try{return {r:calculate(d),error:""};}catch(e){return {r:null,error:e instanceof Error?e.message:"Revisa los datos."};}},[d]);
 const r=result.r;
 function change(key:string,value:string|number){if(!current)return;setCurrent({...current,design:{...d,[key]:value}});setDirty(true);setMessage("");}
 function confirmLeave(){return !dirty||window.confirm("Tienes cambios sin guardar. ¿Descartarlos?");}
 function open(item:RecordItem){if(!confirmLeave())return;setCurrent(structuredClone(item));setDirty(false);setMessage("");setTab("design");}
 function add(){if(!confirmLeave())return;const item=fresh();item.design.name="Canal "+String(records.length+1).padStart(2,"0");setCurrent(item);setDirty(false);setMessage("");setTab("design");}
 async function save(){if(!current||!r)return;setBusy(true);setError("");setMessage("");try{const res=await fetch("/api/designs",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(current)}),data=await res.json() as RecordItem & {error?:string};if(!res.ok)throw Error(data.error);setCurrent(data);setRecords(a=>[data,...a.filter(x=>x.id!==data.id)]);setDirty(false);setMessage("Diseño guardado en línea.");}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar.");}finally{setBusy(false);}}
 function duplicate(){if(!current||!confirmLeave())return;setCurrent({id:crypto.randomUUID(),revision:0,design:{...d,name:(d.name+" · copia").slice(0,240)}});setDirty(true);setMessage("Copia creada. Guarda para añadirla a tus diseños.");setTab("design");}
 async function remove(){if(!current||!current.revision||!window.confirm('¿Eliminar definitivamente "'+d.name+'"?'))return;setBusy(true);setError("");try{const res=await fetch("/api/designs",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:current.id,revision:current.revision})}),data=await res.json() as {error?:string};if(!res.ok)throw Error(data.error);setRecords(a=>a.filter(x=>x.id!==current.id));setCurrent(fresh());setDirty(false);setMessage("Diseño eliminado.");}catch(e){setError(e instanceof Error?e.message:"No se pudo eliminar.");}finally{setBusy(false);}}
 function download(){const blob=new Blob([JSON.stringify({format:"Cap_Canal",version:1,design:d},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=(d.name.replace(/[^a-zA-Z0-9_-]/g,"_")||"canal")+".json";a.click();URL.revokeObjectURL(url);}
 async function upload(file?:File){if(!file||!confirmLeave())return;try{if(file.size>16000)throw Error("El archivo supera el tamaño admitido.");const data=JSON.parse(await file.text());if(data.format!=="Cap_Canal"||data.version!==1)throw Error("El archivo no corresponde a un respaldo de Cap_Canal.");calculate(data.design);setCurrent({id:crypto.randomUUID(),revision:0,design:data.design});setDirty(true);setMessage("Diseño importado. Guarda para almacenarlo en línea.");setTab("design");}catch(e){setError(e instanceof Error?e.message:"Archivo inválido.");}}
 useEffect(()=>{const onLeave=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",onLeave);return()=>window.removeEventListener("beforeunload",onLeave);},[dirty]);
 function field(key:keyof Design,label:string,unit:string,step="any"){return <label className="field"><span>{label}<small>{unit}</small></span><input type="number" step={step} value={Number.isNaN(d[key])?"":d[key]} onChange={e=>change(key,e.target.value===""?NaN:Number(e.target.value))} /></label>;}
 const metrics=r?[["Tirante normal",fmt(r.yn),"m"],["Velocidad media",fmt(r.velocity,3),"m/s"],["Número de Froude",fmt(r.fr,3),r.regime],["Tirante crítico",fmt(r.yc),"m"]]:[];
 const resultRows=r?[["Área mojada · A",r.area,"m²"],["Perímetro mojado · P",r.perimeter,"m"],["Radio hidráulico · R",r.radius,"m"],["Espejo de agua · T",r.top,"m"],["Profundidad hidráulica · D",r.depth,"m"],["Energía específica · E (α = 1)",r.energy,"m"],["Esfuerzo cortante medio · τ",r.shear,"Pa"],["Capacidad con borde libre",r.capacity,"m³/s"],["Altura sobre el agua · H − yₙ",r.remaining,"m"]]:[];
 return <div className="shell">
 <aside className="sidebar no-print">
 <a className="brand" href="/"><span className="brand-icon"><Waves size={25}/></span><span>Cap_Canal<small>ESTUDIO HIDRÁULICO</small></span></a>
 <div className="workspace-label">ESPACIO DE DISEÑO <span>01</span></div>
 <button className="new-btn" onClick={add} disabled={busy}><Plus size={18}/> Nuevo canal</button>
 <div className="list-heading"><span>MIS DISEÑOS <b>{records.length}</b></span><button className="icon-btn" onClick={load} aria-label="Recargar lista" disabled={loading||busy}><RefreshCw size={15}/></button></div>
 <label className="search"><Search size={16}/><input aria-label="Buscar diseños" placeholder="Buscar un canal…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 <div className="record-list">{loading?<p className="sidebar-hint">Cargando diseños…</p>:records.length===0?<div className="empty"><FolderOpen size={29}/><p>Tu próximo canal<br/>empieza aquí.</p><small>Guarda tu primer diseño para encontrarlo en esta lista.</small></div>:records.filter(x=>(x.design.name+" "+x.design.project).toLowerCase().includes(search.toLowerCase())).map(item=><button className={"record "+(current?.id===item.id?"active":"")} key={item.id} onClick={()=>open(item)} disabled={busy}><span className="record-icon"><Waves size={18}/></span><span><strong>{item.design.name}</strong><small>{labels[item.design.section]} · {fmt(item.design.q,3)} m³/s</small></span><ChevronRight size={14}/></button>)}</div>
 <div className="sidebar-footer"><span className="online-dot"/> Diseños guardados en línea<small>Tu espacio privado · Cap_Canal v1.0</small><a href="https://github.com/semaloav/Cap_Canal" target="_blank" rel="noreferrer">Código en GitHub <ArrowUpRight size={12}/></a></div>
 </aside>
 <main className="workspace">
 <header className="topbar no-print"><span>Mis diseños <ChevronRight size={13}/> <b>{d.name||"Sin nombre"}</b></span><span className="save-state">{dirty?<><span className="unsaved-dot"/> Cambios sin guardar</>:current?.revision?<><Check size={14}/> Guardado</>:"Nuevo diseño"}</span></header>
 <div className="content">
 <div className="page-heading no-print"><div><div className="eyebrow">INGENIERÍA DE CANALES ABIERTOS</div><h1>{tab==="report"?"Anexo de cálculo":"Diseña el recorrido del agua."}</h1><p>{tab==="report"?"Una memoria clara y lista para acompañar tu informe.":"Define la sección, explora su comportamiento y documenta tu diseño."}</p></div><button className="primary" disabled={!r||busy||!current||(!dirty&&current.revision>0)} onClick={save}><Save size={16}/>{busy?"Procesando…":"Guardar diseño"}</button></div>
 <nav className="tabs no-print"><button className={tab==="design"?"selected":""} onClick={()=>setTab("design")}><Settings2 size={16}/> Diseño hidráulico</button><button className={tab==="report"?"selected":""} onClick={()=>{setTab("report");setReportDate(new Date().toLocaleString("es-PE"));}}><FileText size={16}/> Reporte / anexo</button><div className="tab-tools"><button onClick={duplicate} disabled={busy} title="Duplicar diseño"><Copy size={16}/><span>Duplicar</span></button><button onClick={remove} disabled={!current?.revision||busy} title="Eliminar diseño" className="delete"><Trash2 size={16}/></button></div></nav>
 {error&&<div className="notice error no-print" role="alert"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>setError("")} aria-label="Cerrar aviso"><X size={15}/></button></div>}
 {message&&<div className="notice success no-print" role="status"><Check size={17}/>{message}</div>}
 {result.error&&<div className="notice error" role="alert"><AlertTriangle size={17}/>{result.error}</div>}
 {tab==="design"?<>
 <div className="design-layout">
 <section className="panel input-panel"><div className="panel-title"><span className="step">01</span><h2>Datos del diseño</h2><span className="unit-tag">SISTEMA SI</span></div>
 <div className="panel-body">
 <label className="field"><span>Nombre del canal</span><input maxLength={240} value={d.name} onChange={e=>change("name",e.target.value)}/></label>
 <div className="two-cols"><label className="field"><span>Proyecto</span><input maxLength={240} placeholder="Nombre del proyecto" value={d.project} onChange={e=>change("project",e.target.value)}/></label><label className="field"><span>Elaborado por</span><input maxLength={240} placeholder="Responsable" value={d.author} onChange={e=>change("author",e.target.value)}/></label></div>
 <label className="field"><span>Ubicación / tramo</span><input maxLength={240} placeholder="Progresiva o ubicación" value={d.location} onChange={e=>change("location",e.target.value)}/></label>
 <div className="field-label">Tipo de sección</div><div className="section-options">{Object.entries(labels).map(([key,label])=><button className={d.section===key?"chosen":""} key={key} onClick={()=>change("section",key)}><svg viewBox="0 0 50 22"><path d={key==="rectangular"?"M8 3V19H42V3":key==="triangular"?"M6 3L25 19L44 3":"M5 3L15 19H35L45 3"} fill="none" stroke="currentColor" strokeWidth="2"/></svg>{label}</button>)}</div>
 <h3>Condiciones hidráulicas</h3><div className="two-cols">{field("q","Caudal de diseño · Q","m³/s")}{field("s","Pendiente · S","m/m")}{field("n","Rugosidad · n","Manning")}{d.section!=="triangular"&&field("b","Ancho de fondo · b","m")}{d.section!=="rectangular"&&field("z","Talud lateral · z","H : 1 V")}{field("height","Altura total · H","m")}</div>
 <h3>Criterios de verificación</h3><div className="two-cols">{field("freeboard","Borde libre requerido","m")}{field("vmin","Velocidad mínima","m/s")}{field("vmax","Velocidad máxima","m/s")}</div><p className="hint">Los valores iniciales son editables y referenciales. Define los criterios de tu proyecto.</p>
 <label className="field"><span>Observaciones</span><textarea maxLength={6000} rows={3} placeholder="Revestimiento, supuestos o notas para el anexo…" value={d.notes} onChange={e=>change("notes",e.target.value)}/></label>
 </div></section>
 <div className="results-column">{r&&<>
 <section className="panel visual-panel"><div className="panel-title"><span className="step">02</span><h2>Tu sección, en detalle</h2><span className="live-tag"><span/> Cálculo en vivo</span></div><Section d={d} r={r}/><div className="legend"><span><i/> Nivel de agua</span><span><i className="wall"/> Pared del canal</span><span>Escala proporcional</span></div></section>
 <div className="metrics">{metrics.map(([label,value,unit],i)=><div className="metric" key={label}><small>{label}</small><strong>{value}<span>{i===2?"":unit}</span></strong>{i===2&&<em>{unit}</em>}</div>)}</div>
 <section className="panel"><div className="panel-title"><span className="step">03</span><h2>Revisión del diseño</h2></div><div className="checks"><div className={r.capacityOk?"check-row":"check-row warn"}>{r.capacityOk?<Check size={18}/>:<AlertTriangle size={18}/>}<div><strong>{r.capacityOk?"Altura y borde libre disponibles":"Revisar la altura del canal"}</strong><p>H − yₙ = {fmt(r.remaining,3)} m · requerido ≥ {fmt(d.freeboard,3)} m</p></div><span>{r.capacityOk?"Cumple":"Revisar"}</span></div><div className={r.velocityOk?"check-row":"check-row warn"}>{r.velocityOk?<Check size={18}/>:<AlertTriangle size={18}/>}<div><strong>{r.velocityOk?"Velocidad dentro del intervalo":"Velocidad fuera del intervalo"}</strong><p>{fmt(d.vmin,2)} ≤ V ≤ {fmt(d.vmax,2)} m/s · criterio del usuario</p></div><span>{r.velocityOk?"Cumple":"Revisar"}</span></div></div></section>
 <section className="panel"><div className="panel-title"><ChartNoAxesCombined size={18}/><h2>Curva de capacidad</h2><span className="hint">Punto dorado: diseño actual</span></div><Curve d={d} r={r}/></section>
 <details className="panel details"><summary>Propiedades y resultados adicionales</summary><table><tbody>{resultRows.map(([label,value,unit])=><tr key={label}><td>{label}</td><td>{fmt(Number(value))} {unit}</td></tr>)}</tbody></table></details>
 </>}
 <div className="method-note"><strong>Método de Manning · flujo uniforme</strong><p>Canal prismático, pendiente de energía aproximada por la pendiente longitudinal. Estas verificaciones no incluyen remansos, erosión ni estabilidad estructural.</p></div>
 </div></div>
 <div className="backup-tools"><span>Respalda o recupera un diseño</span><button onClick={download} disabled={!r}><Download size={15}/> Exportar JSON</button><label className="file-button"><Upload size={15}/> Importar JSON<input type="file" accept=".json,application/json" onChange={e=>{upload(e.target.files?.[0]);e.target.value="";}}/></label></div>
 </>:r&&<>
 <div className="report-tools no-print"><p>El anexo usa los valores actuales del editor.{dirty?" Guarda el diseño para conservar estos cambios.":""}</p><button className="primary" onClick={()=>window.print()}><FileText size={16}/> Imprimir / guardar PDF</button></div>
 <article className="report"><header className="report-heading"><div><div className="eyebrow">ANEXO TÉCNICO · CAP_CANAL</div><h1>Memoria de cálculo hidráulico</h1><p>{d.name}</p></div><Waves size={38}/></header>
 <div className="report-meta">{[["Proyecto",d.project||"No indicado"],["Ubicación / tramo",d.location||"No indicada"],["Elaborado por",d.author||"No indicado"],["Emitido",reportDate],["Estado",dirty||!current?.revision?"Borrador · valores del editor":"Diseño guardado · revisión "+current.revision]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
 <h2>1. Objeto y supuestos</h2><p>Evaluación de una sección {labels[d.section].toLowerCase()} para conducir un caudal de {fmt(d.q)} m³/s. Se adopta flujo permanente uniforme en canal prismático, con pendiente de energía igual a la pendiente longitudinal. Se calcula el tirante normal mediante la ecuación de Manning en unidades SI.</p>
 <h2>2. Datos de entrada</h2><table><thead><tr><th>Parámetro</th><th>Valor</th><th>Unidad / definición</th></tr></thead><tbody>{[["Caudal · Q",d.q,"m³/s"],["Rugosidad · n",d.n,"Manning, SI"],["Pendiente · S",d.s,"m/m"],["Ancho de fondo · b",d.section==="triangular"?0:d.b,"m"],["Talud · z",d.section==="rectangular"?0:d.z,"H : 1 V"],["Altura total · H",d.height,"m"],["Borde libre requerido",d.freeboard,"m"],["Velocidad mínima",d.vmin,"m/s"],["Velocidad máxima",d.vmax,"m/s"]].map(([k,v,u])=><tr key={k}><td>{k}</td><td>{fmt(Number(v),6)}</td><td>{u}</td></tr>)}</tbody></table>
 <h2>3. Método de cálculo</h2><div className="equations"><p>A = y(b + zy) · P = b + 2y√(1 + z²) · T = b + 2zy</p><p>R = A/P · D = A/T · Q = (1/n)AR²ᐟ³S¹ᐟ²</p><p>V = Q/A · Fr = V/√(gD) · Q²T/(gA³) = 1 para y = y꜀</p><p>E = y + V²/(2g), α = 1 · τ = ρgRS · ρ = 1000 kg/m³ · g = 9.80665 m/s²</p></div><p>El tirante normal y el crítico se resuelven por bisección. La capacidad se evalúa a una profundidad H menos el borde libre requerido. El esfuerzo cortante es un promedio de la sección.</p>
 <h2>4. Resultados hidráulicos</h2><table><thead><tr><th>Resultado</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>{[["Tirante normal · yₙ",r.yn,"m"],["Tirante crítico · y꜀",r.yc,"m"],["Velocidad · V",r.velocity,"m/s"],["Froude · Fr",r.fr,"—"],...resultRows].map(([k,v,u])=><tr key={k}><td>{k}</td><td>{fmt(Number(v),6)}</td><td>{u}</td></tr>)}</tbody></table><p><strong>Régimen: {r.regime}.</strong> Residuo absoluto en la ecuación de caudal: {r.residual.toExponential(2)} m³/s.</p>
 <div className="report-figure"><h2>5. Sección transversal</h2><Section d={d} r={r}/><p>Sección esquemática proporcional. Dimensiones en metros.</p></div>
 <h2>6. Verificaciones y observaciones</h2><p><strong>Altura y borde libre: {r.capacityOk?"cumple":"requiere revisión"}.</strong> Altura sobre el agua: {fmt(r.remaining)} m; borde libre requerido: {fmt(d.freeboard)} m.</p><p><strong>Velocidad: {r.velocityOk?"cumple el intervalo":"fuera del intervalo"} definido por el usuario.</strong> V = {fmt(r.velocity)} m/s; intervalo: {fmt(d.vmin)} a {fmt(d.vmax)} m/s.</p><p className="preserve">{d.notes||"No se registraron observaciones adicionales."}</p><p>Estos resultados comprueban los criterios introducidos y no constituyen una aprobación integral. No se evalúan flujo gradualmente variado, transiciones, captaciones laterales, sedimentos, erosión ni estabilidad estructural. En canales de pequeña escala, debe revisarse la aplicabilidad de Manning según rugosidad y régimen de flujo.</p>
 <h2>7. Referencias del método</h2><ul><li>USACE. HEC-RAS Technical Reference Manual: <a href="https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/stable-channel-design-functions/uniform-flow-computations">Uniform Flow Computations</a>.</li><li>USBR. Water Measurement Manual, capítulo 2, sección 11: <a href="https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_11.html">Hydraulic Mean Depth and Hydraulic Radius</a>.</li></ul><footer>Generado con Cap_Canal v1.0 · Verificar los supuestos y criterios del proyecto antes de emitir.</footer>
 </article></>}
 <footer className="app-footer no-print">CAP_CANAL <span>Herramientas claras para decisiones hidráulicas.</span><span>v1.0 · SI</span></footer>
 </div></main></div>;
}
