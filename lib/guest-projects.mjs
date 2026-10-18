import {validateProject} from "./project.mjs";
export const GUEST_KEY="cap-canal:guest-projects:v1";
export function readGuestProjects(storage){
 const raw=storage.getItem(GUEST_KEY);if(!raw)return [];
 let parsed;try{parsed=JSON.parse(raw);}catch{throw Error("No se pudo leer el guardado de este navegador. No se sobrescribirá; puedes seguir calculando y exportar un respaldo JSON.");}
 if(!parsed||parsed.version!==1||!Array.isArray(parsed.projects))throw Error("El guardado local no tiene un formato compatible. No se sobrescribirá.");
 return parsed.projects.map(item=>{
  if(!item||typeof item.id!=="string"||!Number.isInteger(item.revision)||item.revision<1)throw Error("Hay un proyecto local inválido. No se sobrescribirá el guardado.");
  return {...item,design:validateProject(item.design)};
 });
}
export function saveGuestProject(storage,item){
 const projects=readGuestProjects(storage),previous=projects.find(p=>p.id===item.id);
 if(previous&&previous.revision!==item.revision||!previous&&item.revision!==0)throw Error("Este proyecto cambió en otra pestaña. Exporta tu copia y recarga la lista.");
 const saved={id:item.id,design:validateProject(item.design),revision:item.revision+1,updatedAt:new Date().toISOString()};
 storage.setItem(GUEST_KEY,JSON.stringify({version:1,projects:[saved,...projects.filter(p=>p.id!==item.id)]}));return saved;
}
export function deleteGuestProject(storage,item){
 const projects=readGuestProjects(storage),previous=projects.find(p=>p.id===item.id);
 if(!previous||previous.revision!==item.revision)throw Error("Este proyecto cambió o ya fue eliminado en otra pestaña. Recarga la lista.");
 storage.setItem(GUEST_KEY,JSON.stringify({version:1,projects:projects.filter(p=>p.id!==item.id)}));
}
