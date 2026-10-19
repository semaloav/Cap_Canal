export function flumeDefaults(d={}) {
 const start=d.start??0,end=d.end??100,length=end-start,spacing=d.gvf?.interval??d.step??10;
 const inlet={station:start,approach:start,height:Math.min(.2,(d.height??.8)/2),thickness:.005,width:Math.max(d.b??.5,.001),cd:.61,free:true};
 const outlet={...inlet,station:end,approach:end};
 const f=d.flume??{};
 return {
  inlet:{...inlet,...f.inlet},outlet:{...outlet,...f.outlet},
  entry:{station:start+length*.01,mode:"energy",loss:0,depth:.01,...f.entry},
  super:{station:start+length*.01,depth:d.gvf?.regime==="supercritical"?d.gvf.depth:.01,count:11,interval:Math.min(spacing,length*.09),...f.super},
  sub:{count:11,interval:Math.max(1e-6,(length-inlet.thickness)/10),...f.sub},
  jump:{mode:"automatic",station:start+length/2,length:0,force:0,forceMode:"neglect",acceptNeglect:false,...f.jump}
 };
}
export function validateFlume(d) {
 const f=flumeDefaults(d);
 const numeric={inlet:["station","approach","height","thickness","width","cd"],outlet:["station","approach","height","thickness","width","cd"],entry:["station","loss","depth"],super:["station","depth","count","interval"],sub:["count","interval"],jump:["station","length","force"]};
 for(const [group,keys] of Object.entries(numeric))for(const k of keys)if(!Number.isFinite(f[group][k]))throw Error("Revisa "+group+" · "+k+".");
 for(const a of [f.inlet,f.outlet])if(a.height<0||a.thickness<=0||a.width<=0||a.cd<=0||a.cd>1||typeof a.free!=="boolean")throw Error("Barrajes de entrada/salida: alturas no negativas, espesor y ancho positivos, 0 < Cd ≤ 1.");
 for(const a of [f.super,f.sub])if(!Number.isInteger(a.count)||a.count<2||a.count>2000||a.interval<1e-6)throw Error("Cada rama requiere de 2 a 2000 secciones y X ≥ 0.000001 m.");
 if(f.entry.loss<0||f.entry.depth<=0||f.super.depth<=0||f.jump.length<0)throw Error("Revisa tirantes, pérdidas de entrada y longitud del salto.");
 if(!["energy","measured","impact"].includes(f.entry.mode)||!["automatic","manual"].includes(f.jump.mode)||!["neglect","specified"].includes(f.jump.forceMode)||typeof f.jump.acceptNeglect!=="boolean")throw Error("Revisa el método de entrada o salto.");
 return Object.fromEntries(Object.entries(numeric).map(([group,keys])=>[group,Object.fromEntries([...keys,...(group==="inlet"||group==="outlet"?["free"]:group==="entry"?["mode"]:group==="jump"?["mode","forceMode","acceptNeglect"]:[])].map(k=>[k,f[group][k]]))]));
}
