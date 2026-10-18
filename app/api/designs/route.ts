import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { designs } from "../../../db/schema";
import { and, eq, desc } from "drizzle-orm";
import { validateProject, newProject } from "../../../lib/project.mjs";
export const dynamic="force-dynamic";
function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión para acceder a tus diseños."},401);
 try{const rows=await getDb().select().from(designs).where(eq(designs.ownerId,user.userId)).orderBy(desc(designs.updatedAt));return json(rows.map(r=>({id:r.id,design:newProject(JSON.parse(r.payload)),revision:r.revision,updatedAt:r.updatedAt})));}catch{return json({error:"No se pudieron cargar los diseños. Intenta nuevamente."},503);}
}
async function input(request:Request){
 const origin=request.headers.get("origin");if(!origin||origin!==new URL(request.url).origin)throw Error("Origen no permitido.");
 const raw=await request.text();if(raw.length>750000)throw Error("Solicitud demasiado grande.");
 return JSON.parse(raw);
}
export async function PUT(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión para guardar."},401);
 try{
 const {id,design,revision}=await input(request);
 if(typeof id!=="string"||!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!Number.isInteger(revision)||revision<0)throw Error("Identificador o revisión inválidos.");
 const normalized=validateProject(design);
 const updatedAt=new Date().toISOString();
 const payload=JSON.stringify(normalized);
 const db=getDb();
 if(revision===0){
  try{await db.insert(designs).values({id,ownerId:user.userId,payload,revision:1,updatedAt});}catch{return json({error:"No se pudo crear el diseño. Recarga la lista y vuelve a intentarlo."},409);}
 }else{
  const result=await db.update(designs).set({payload,revision:revision+1,updatedAt}).where(and(eq(designs.id,id),eq(designs.ownerId,user.userId),eq(designs.revision,revision))).returning({id:designs.id});
  if(!result.length)return json({error:"El diseño cambió en otra sesión. Exporta tu copia y recarga la lista antes de continuar."},409);
 }
 return json({id,design:JSON.parse(payload),revision:revision+1,updatedAt});
 }catch(e){return json({error:e instanceof Error?e.message:"No se pudo guardar."},400);}
}
export async function DELETE(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión para eliminar."},401);
 try{const {id,revision}=await input(request);if(typeof id!=="string"||!Number.isInteger(revision)||revision<1)throw Error("Solicitud inválida.");
 const rows=await getDb().delete(designs).where(and(eq(designs.id,id),eq(designs.ownerId,user.userId),eq(designs.revision,revision))).returning({id:designs.id});
 if(!rows.length)return json({error:"El diseño cambió o ya fue eliminado. Recarga la lista."},409);return json({ok:true});
 }catch(e){return json({error:e instanceof Error?e.message:"No se pudo eliminar."},400);}
}
