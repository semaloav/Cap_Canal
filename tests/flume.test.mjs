import assert from 'node:assert/strict';
import {newProject,validateProject,gradeAt} from '../lib/project.mjs';
import {G,calculate} from '../lib/hydraulics.mjs';
import {solveFlume,branchSolution,designSampler,conjugateDepth,specificForce,weirBoundary,entryResult} from '../lib/flume.mjs';
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const d=newProject({section:'rectangular',q:.001,b:.1,n:.01,s:.001,height:.3,freeboard:.01,start:0,end:1,step:.1,grades:[{end:1,slope:.001}],flume:{inlet:{height:.1,width:.1},outlet:{height:.02,width:.1},entry:{station:.01},super:{station:.01,depth:.006,count:10,interval:.1},sub:{count:10,interval:.1},jump:{acceptNeglect:true,length:.05}}});
const result=solveFlume(d);
assert.equal(result.error,'');assert.equal(result.super.complete,true);assert.equal(result.sub.complete,true);
// Independent closed-form free overflow and entry energy closure.
const h=(3*d.q/(2*.61*.1*Math.sqrt(2*G)))**(2/3);
close(result.entry.p0.head,h,1e-12);close(result.outlet.y,.02+h,1e-12);
close(result.entry.p1.egl,result.entry.p0.water,1e-9);assert.ok(result.entry.p1.fr>1);
const measured=entryResult({...d,flume:{...d.flume,entry:{...d.flume.entry,mode:'measured',depth:result.entry.p1.y}}});close(measured.p1.loss,0,1e-9);
const impossible=solveFlume({...d,flume:{...d.flume,entry:{...d.flume.entry,loss:1}}});assert.ok(impossible.entry.error.includes('energía mínima'));assert.equal(impossible.entry.p1,null);assert.ok(impossible.entry.p0);
// Conjugate-depth solver vs Bélanger, and generalized momentum for both other shapes.
const y2=.006,fr=d.q/(d.b*y2)/Math.sqrt(G*y2),analytical=y2/2*(Math.sqrt(1+8*fr*fr)-1);
close(conjugateDepth(d,y2),analytical,1e-9);
for(const shape of ['rectangular','trapezoidal','triangular']){const s={...d,section:shape,z:1},small=calculate(s).yc*.4,large=conjugateDepth(s,small);assert.ok(large>calculate(s).yc);close(specificForce(s,small),specificForce(s,large),1e-9);}
// Both solutions may coexist at the same real station without sharing a state.
const sampler=designSampler(d),upper=branchSolution(d,'super',sampler,[.5]),lower=branchSolution(d,'sub',sampler,[.5]);
const u=upper.rows.find(r=>r.station===.5),l=lower.rows.find(r=>r.station===.5);
close(u.invert,l.invert,1e-12);close(u.invert,gradeAt(d,.5).invert,1e-12);assert.ok(u.state.fr>1&&l.state.fr<1);assert.notEqual(u.state.y,l.state.y);
for(const profile of [upper,lower])for(const row of profile.rows)if(row.state){close(row.invert,gradeAt(d,row.station).invert,1e-12);if(row.dx)assert.ok(row.state.residual<=d.gvf.tolerance*1.01);}
const changed={...d,flume:{...d.flume,super:{...d.flume.super,count:5,interval:.15}}};
const states=p=>p.rows.map(r=>({station:r.station,invert:r.invert,state:r.state}));
assert.deepEqual(states(branchSolution(changed,'sub')),states(branchSolution(d,'sub')));
// Never reset the global invert when the branch starts away from x=0.
const graded={...d,startInvert:100,grades:[{end:.45,slope:.001},{end:1,slope:.003}]};
const gradedBranch=branchSolution(graded,'super');assert.ok(gradedBranch.rows.some(r=>r.station===.45&&r.origins.includes('grade')));
for(const row of gradedBranch.rows)close(row.invert,gradeAt(graded,row.station).invert,1e-12);
// Count changes add regular nodes without changing the sampled geometry.
const denser=branchSolution({...d,flume:{...d.flume,super:{...d.flume.super,count:19,interval:.05}}},'super');
assert.equal(denser.requested,19);for(const row of denser.rows)close(row.section.b,.1,1e-12);
// A failed hydraulic boundary still exposes the generated mesh.
const bad=branchSolution({...d,flume:{...d.flume,super:{...d.flume.super,depth:.1}}},'super');
assert.ok(bad.error.includes('régimen'));assert.ok(bad.rows.length>=10);assert.ok(bad.rows.every(r=>r.state===null));
const outside=branchSolution({...d,flume:{...d.flume,super:{...d.flume.super,count:100}}},'super');assert.ok(outside.error.includes('alineamiento'));assert.equal(outside.complete,false);
const drowned={...d,flume:{...d.flume,outlet:{...d.flume.outlet,free:false}}};assert.throws(()=>weirBoundary(drowned,'outlet'),/sumergido/);assert.equal(solveFlume(drowned).sub.complete,false);
// Finite jump: exact inserted endpoints satisfy generalized momentum, not an interpolated guess.
assert.equal(result.jump.complete,true,result.jump.error);assert.ok(result.jump.loss>0);assert.ok(result.jump.relative<1e-5);
close(result.jump.x3-result.jump.x2,.05,1e-10);
for(const [profile,x] of [[result.super,result.jump.x2],[result.sub,result.jump.x3]])assert.ok(profile.rows.some(r=>Math.abs(r.station-x)<1e-6&&r.origins.includes('jump')));
assert.ok(result.profile.rows.some(r=>!r.state&&r.status==='Salto · sin FGV'));
const manual=solveFlume({...d,flume:{...d.flume,jump:{...d.flume.jump,mode:'manual',station:result.jump.x2}}});assert.equal(manual.jump.complete,true,manual.jump.error);
const unaccepted=solveFlume({...d,flume:{...d.flume,jump:{...d.flume.jump,acceptNeglect:false}}});assert.equal(unaccepted.jump.complete,false);assert.ok(unaccepted.jump.error.includes('fuerza externa'));
const impact=solveFlume({...d,flume:{...d.flume,entry:{...d.flume.entry,mode:'impact'}}});assert.equal(impact.entry.p1,null);assert.equal(impact.jump.complete,false);assert.equal(impact.super.complete,true);
// Migration and serialization preserve settings and the old single-branch configuration.
const {flume,...old}=d;const migrated=validateProject({...old,schemaVersion:5});assert.equal(migrated.schemaVersion,6);assert.deepEqual(migrated.gvf,d.gvf);assert.ok(migrated.flume);
const saved=validateProject(JSON.parse(JSON.stringify(d)));assert.deepEqual(saved.flume,d.flume);
assert.throws(()=>validateProject({...d,flume:{...d.flume,super:{...d.flume.super,count:2.5}}}),/2000/);
console.log('Canal experimental: rebose, entrada, dos ramas, rasante global, momento del salto finito, límites y migración v6: OK');
