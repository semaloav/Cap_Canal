import assert from "node:assert/strict";
import {newProject,validateProject} from "../lib/project.mjs";
import {calculate} from "../lib/hydraulics.mjs";
import {newBarrier} from "../lib/barriers.mjs";
import {solveGVF,plateDischarge} from "../lib/gvf.mjs";
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const base=newProject({section:"rectangular",b:1,q:.2,n:.015,height:2,freeboard:.1,s:.001,grades:[{end:100,slope:.001}]});
for(const family of ["rectangular","trapezoidal","triangular"]){
 for(const slope of [.0005,.02]){
  const p=newProject({...base,section:family,s:slope,grades:[{end:100,slope}],gvf:{boundary:"normal",energySlope:slope,regime:calculate({...base,section:family,s:slope}).fr<1?"subcritical":"supercritical"}});
  const solved=solveGVF(p);assert.equal(solved.error,"");
  for(const row of solved.rows){close(row.state.y,row.r.yn);assert.ok(row.state.residual<=p.gvf.tolerance);}
 }
}
const p=newProject({...base,gvf:{depth:.7,contraction:0,expansion:0}}),r=solveGVF(p);
assert.equal(r.error,"");assert.ok(r.rows[0].state.y<r.rows.at(-1).state.y); // M1 backwater
for(let i=0;i<r.rows.length-1;i++)close(r.rows[i].state.egl-r.rows[i+1].state.egl,r.rows[i].hf+r.rows[i].hl,2e-6);
// Independent RK4 integration of dy/dx=(S0-Sf)/(1-Fr²), backwards.
let y=.7,dx=-.002;
function rhs(y){const A=y,R=y/(1+2*y),V=.2/A,Sf=(.2*.015/(A*R**(2/3)))**2;return (.001-Sf)/(1-V*V/(9.80665*y));}
for(let i=0;i<50000;i++){const a=rhs(y),b=rhs(y+dx*a/2),c=rhs(y+dx*b/2),d=rhs(y+dx*c);y+=dx*(a+2*b+2*c+d)/6;}
const fine=solveGVF({...p,gvf:{...p.gvf,interval:1}});close(fine.rows[0].state.y,y,1e-6);
assert.ok(Math.abs(fine.rows[0].state.y-y)<Math.abs(r.rows[0].state.y-y));
// Stage and depth boundary are equivalent.
const stage=solveGVF({...p,gvf:{...p.gvf,boundary:"stage",stage:-.1+.7}});close(stage.rows[0].state.y,r.rows[0].state.y);
// Covered submerged orifice has an analytic upstream depth.
const plate={...newBarrier(50),mode:"underflow",opening:.1,crest:1.5};
const withPlate=newProject({...base,barriers:[plate],gvf:{depth:.7}}),control=solveGVF(withPlate);
assert.equal(control.error,"");const up=control.rows.find(a=>a.side==="Aguas arriba"),down=control.rows.find(a=>a.side==="Aguas abajo");
const expected=down.state.water-up.invert+(.2/(.61*.1))**2/(2*9.80665);
close(up.state.y,expected);close(plateDischarge(plate,base,up.state.y,down.state.water-up.invert).total,.2,1e-8);
assert.ok(control.rows[0].state.y>r.rows[0].state.y);assert.ok(up.hl>0);
// More than one structure couples through the computed downstream profile.
const second={...plate,id:crypto.randomUUID(),station:20,name:"Segundo"};
const pair=solveGVF({...withPlate,barriers:[plate,second]});assert.equal(pair.error,"");
assert.equal(pair.rows.filter(r=>r.state?.control).length,2);assert.ok(pair.rows[0].state.y>control.rows[0].state.y);
// A crest control must also change the upstream water surface, without manual levels.
const crestControl=solveGVF({...base,barriers:[{...plate,mode:"crest",opening:0,crest:.6}],gvf:{...p.gvf,depth:.4}});
assert.equal(crestControl.error,"");const cu=crestControl.rows.find(r=>r.side==="Aguas arriba"),cd=crestControl.rows.find(r=>r.side==="Aguas abajo");
close(plateDischarge({...plate,mode:"crest",opening:0,crest:.6},base,cu.state.y,cd.state.water-cu.invert).total,.2,1e-8);
assert.ok(cu.state.water>cd.state.water);
// Variable geometry and friction preserve energy with nonzero local losses.
const variable=solveGVF({...withPlate,barriers:[],overrides:{"50":{b:.8,n:.02}}});assert.equal(variable.error,"");
for(let i=0;i<variable.rows.length-1;i++)close(variable.rows[i].state.egl-variable.rows[i+1].state.egl,variable.rows[i].hf+variable.rows[i].hl,2e-6);
// Free crest and submerged correction are independently checked.
const crest={...plate,mode:"crest",opening:0,crest:.5};
close(plateDischarge(crest,base,.8,.3).total,(2/3)*.61*Math.sqrt(2*9.80665)*.3**1.5,1e-12);
close(plateDischarge(crest,base,.8,.6).total,plateDischarge(crest,base,.8,.3).total*(1-(.1/.3)**1.5)**.385,1e-12);
assert.equal(solveGVF({...p,gvf:{...p.gvf,depth:.001}}).complete,false);
assert.ok(solveGVF({...p,overrides:{"50":{q:.3}}}).rows.every(r=>r.state===null));
assert.ok(solveGVF({...p,overrides:{"50":{section:"triangular"}}}).rows.every(r=>r.state===null));
const bad=solveGVF({...withPlate,gvf:{...withPlate.gvf,regime:"supercritical",depth:.05}});
assert.equal(bad.complete,false);assert.ok(bad.rows.some(r=>r.state===null));
const saved=validateProject(JSON.parse(JSON.stringify(withPlate)));assert.equal(saved.gvf.depth,.7);assert.equal(saved.schemaVersion,6);
assert.throws(()=>validateProject({...p,gvf:{...p.gvf,contraction:-1}}));
console.log("FGV: uniforme en 3 geometrías y 2 regímenes, balance de energía, RK4 independiente, convergencia de malla, barraje/orificio analítico, Villemonte, contornos y fallos explícitos: OK");
