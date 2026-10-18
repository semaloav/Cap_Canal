import assert from "node:assert/strict";
import {defaults,calculate,discharge,geometry,G} from "../lib/hydraulics.mjs";
const rect={...defaults,section:"rectangular",b:2,q:3,n:0.015,s:0.001};
const r=calculate(rect);
assert.ok(Math.abs(r.yc-Math.cbrt(9/(G*4)))<1e-10);
assert.ok(Math.abs(discharge(rect,r.yn)-3)<1e-10);
assert.ok(Math.abs(r.area-2*r.yn)<1e-12);
for(const section of ["rectangular","trapezoidal","triangular"]){
 for(const q of [0.00025,0.25,25]){
 const d={...defaults,section,q},a=calculate(d);
 assert.ok(a.yn>0&&a.yc>0&&Number.isFinite(a.fr));
 const c=geometry(d,a.yc);assert.ok(Math.abs(d.q**2*c.top/(G*c.area**3)-1)<1e-10);
 assert.ok(Math.abs(discharge(d,a.yn)-q)/q<1e-10);
 }
}
const d={...defaults,section:"rectangular",q:0.001,height:0.01,freeboard:0.001};assert.equal(calculate(d).capacityOk,false);
for(const patch of [{q:0},{n:0},{s:-1},{q:NaN},{freeboard:1},{vmin:4,vmax:2},{section:"triangular",z:0},{b:0}]){
 assert.throws(()=>calculate({...defaults,...patch}));
}
console.log("Pruebas hidráulicas: 3 secciones, 3 escalas de caudal, tirante crítico, capacidad y entradas inválidas: OK.");
