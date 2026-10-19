import assert from 'node:assert/strict';
import {newProject,validateProject,gradeAt,stationKey} from '../lib/project.mjs';
import {G} from '../lib/hydraulics.mjs';
import {solveFlume,branchSolution} from '../lib/flume.mjs';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const d=newProject({section:'rectangular',q:.001,b:.1,n:.01,s:.001,height:.3,freeboard:.01,start:0,end:1,step:.1,grades:[{end:1,slope:.001}],flume:{inlet:{height:.1,width:.1},outlet:{height:.02,width:.1},entry:{station:.01},super:{station:.01,depth:.006,count:10,interval:.1},sub:{count:10,interval:.1},jump:{lengthMethod:'elevatorski',acceptNeglect:true}}});
const solution=solveFlume(d),j=solution.jump;
assert.equal(j.complete,true,j.error);assert.ok(j.x3>j.x2);assert.ok(j.loss>0);
// Independent rectangular Bélanger expression, not the solver's returned conjugate.
const fr=d.q/(d.b*j.y2)/Math.sqrt(G*j.y2),target=j.y2*(Math.sqrt(1+8*fr*fr)-1)/2;
close(j.conjugate,target);close(j.length,6.9*(target-j.y2));close(j.x3,j.x2+j.length);
assert.ok(Math.abs(j.y3-target)<=1e-6);
close(j.depthResidual,j.y3-target,1e-10);
for(const [profile,x] of [[solution.super,j.x2],[solution.sub,j.x3]]){
 const row=profile.rows.find(r=>r.key===stationKey(x));assert.ok(row?.state);close(row.invert,gradeAt(d,row.station).invert,1e-12);assert.ok(row.origins.includes('jump'));
}
// The coincident comparison at P2 would give a different answer; P3 is essential.
const lowerAtP2=branchSolution(d,'sub',undefined,[j.x2]).rows.find(r=>r.key===stationKey(j.x2));
assert.ok(Math.abs(lowerAtP2.state.y-target)>j.tolerance*10);
assert.ok(j.trace.length>1);assert.ok(j.trace.every(p=>Math.abs(p.x3-p.x2-p.length)<1e-12));
const manual={...d,flume:{...d.flume,jump:{...d.flume.jump,mode:'manual',station:j.x2}}};
assert.equal(solveFlume(manual).jump.complete,true);
const wrong=solveFlume({...d,flume:{...d.flume,jump:{...d.flume.jump,mode:'manual',station:.5}}}).jump;
assert.equal(wrong.complete,false);assert.ok(wrong.p2&&wrong.p3);assert.ok(Math.abs(wrong.depthResidual)>1e-6);
const short={...d,flume:{...d.flume,sub:{count:2,interval:.05},jump:{...d.flume.jump,mode:'manual',station:j.x2}}};
assert.match(solveFlume(short).jump.error,/Cobertura/);
const unaccepted={...d,flume:{...d.flume,jump:{...d.flume.jump,acceptNeglect:false}}};
assert.match(solveFlume(unaccepted).jump.error,/hipótesis/);
assert.match(solveFlume({...d,section:'trapezoidal'}).jump.error,/rectangular/);
// Migration preserves a measured length and does not silently enable a new model.
const old=structuredClone(d);delete old.flume.jump.lengthMethod;old.flume.jump.length=.05;
const migrated=validateProject(old);assert.equal(migrated.flume.jump.lengthMethod,'manual');assert.equal(migrated.flume.jump.length,.05);
assert.equal(newProject().flume.jump.lengthMethod,'elevatorski');
assert.equal(validateProject(JSON.parse(JSON.stringify(d))).flume.jump.lengthMethod,'elevatorski');
assert.throws(()=>validateProject({...d,flume:{...d.flume,jump:{...d.flume.jump,lengthMethod:'universal'}}}));
console.log('Ubicación P2/P3: conjugado de Bélanger, longitud variable, coincidencia desplazada, extremos FGV, cobertura y migración: OK');
