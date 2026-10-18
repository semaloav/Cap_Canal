"use client";
import {BarrierDiagram,BarrierResults} from "./barrier-editor";
import {barrierRating} from "../lib/barriers.mjs";
import {stationLabel,stationKey,gradeAt} from "../lib/project.mjs";
import {fmt} from "./engineering-views";
import type {Project} from "./types";
export default function BarrierReport({d}:{d:Project}){
 if(!d.barriers.length)return <><h2>5.1 Barrajes de lámina</h2><p>No se incorporaron barrajes en este proyecto.</p></>;
 return <><h2>5.1 Barrajes de lámina transversal</h2><p>Se definen láminas verticales transversales al canal, mediante su ubicación y espesor en el sentido del flujo. La cresta P y la abertura a se miden desde el fondo local. La progresiva identifica la cara aguas arriba; el espesor se extiende hacia aguas abajo.</p>
 <table className="compact-table"><thead><tr><th>Nombre</th><th>Progresiva</th><th>Configuración</th><th>Espesor t (m)</th><th>Cresta P (m)</th><th>Abertura a (m)</th><th>Cota de cresta (m)</th></tr></thead><tbody>{d.barriers.map(a=><tr key={a.id}><td>{a.name}</td><td>{stationLabel(a.station)}</td><td>{a.mode==="crest"?"Apoyada en fondo":"Levantada"}</td><td>{fmt(a.thickness,5)}</td><td>{fmt(a.crest,4)}</td><td>{fmt(a.opening,4)}</td><td>{fmt(gradeAt(d,a.station).invert+a.crest,4)}</td></tr>)}</tbody></table>
 {d.barriers.map(a=>{const section={...d,...(d.overrides[stationKey(a.station)]??{})} as Project,v=barrierRating(a,section),invert=gradeAt(d,a.station).invert;
 return <div className="report-barrier" key={a.id}><h3>{a.name} · {stationLabel(a.station)}</h3><BarrierDiagram a={a} section={section} invert={invert}/>
 {a.analysis?<><p><strong>Evaluación local:</strong> y₁ = {fmt(a.upstream,4)} m; y₂ = {fmt(a.downstream,4)} m, ambos referidos al fondo local. Cdᵥ = {fmt(a.cdWeir,4)} y Cdₒ = {fmt(a.cdOrifice,4)}. Régimen: {v.regime}.</p><table><thead><tr><th>Rebose por cresta (m³/s)</th><th>Paso inferior (m³/s)</th><th>Total evaluado (m³/s)</th><th>Q de diseño local (m³/s)</th></tr></thead><tbody><tr><td>{fmt(v.over,6)}</td><td>{fmt(v.under,6)}</td><td>{fmt(v.total,6)}</td><td>{fmt(section.q,6)}</td></tr></tbody></table>{v.warnings.map(w=><p key={w}><strong>Observación:</strong> {w}</p>)}</>:<p>No se activó la comprobación manual. El resultado automático del control se presenta en la tabla FGV.</p>}
 {a.notes&&<p className="preserve">{a.notes}</p>}</div>;
 })}
 <h3>Método y alcance de la evaluación local</h3><p>Se adopta pared delgada, flujo hacia aguas abajo y velocidad de aproximación despreciable. El espesor es una dimensión geométrica y no introduce una corrección por cresta gruesa. Los coeficientes son ingresados por el usuario y requieren selección o calibración según las condiciones de descarga.</p>
 <div className="equations"><p>Qᵥ = Cdᵥ √(2g) [(2/3)(b + 2zP)H³ᐟ² + (8/15)zH⁵ᐟ²], H = máx(y₁ − P, 0)</p><p>Qₒ = Cdₒ √(2g) ∫₀ᵃ (b + 2zy) √[y₁ − máx(y₂,y)] dy, con y₁ ≥ a</p><p>Para sección rectangular y orificio completamente sumergido: Qₒ = Cdₒ ba √[2g(y₁ − y₂)]</p><p>Q local = Qᵥ + Qₒ únicamente cuando ambas contribuciones son evaluables.</p></div>
 <p>La integración por franjas es una idealización hidrostática del paso inferior. La expresión rectangular es el caso base; el ancho variable en secciones trapezoidales o triangulares es una generalización que requiere calibración. Esta comprobación manual no evalúa rebose sumergido ni remanso. El perfil FGV del apartado anterior acopla los barrajes y utiliza el nivel aguas abajo calculado; incluye corrección empírica de Villemonte para rebose sumergido. Los niveles manuales no alimentan el cálculo FGV.</p>
 <p>Referencias: <a href="https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_09.html">USBR, Thin Plate Weir Relationships</a>; <a href="https://www.usbr.gov/tsc/techreferences/mands/wmm/chap09_05.html">Discharge Through a Submerged Rectangular Orifice</a>; <a href="https://www.usbr.gov/tsc/techreferences/mands/wmm/chap07_15.html">Weir Submergence</a>.</p></>;
}
