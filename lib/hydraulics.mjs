export const G=9.80665;
export const defaults={name:"Canal 01",project:"",author:"",location:"",section:"trapezoidal",q:0.25,b:0.5,z:1,n:0.015,s:0.005,height:0.8,freeboard:0.2,vmin:0.3,vmax:3,notes:""};
export function validate(d){
 if(!d||typeof d!=="object"||Array.isArray(d))throw Error("Diseño inválido.");
 if(!["rectangular","trapezoidal","triangular"].includes(d.section))throw Error("Selecciona una sección válida.");
 for(const k of ["name","project","author","location","notes"])if(typeof d[k]!=="string"||d[k].length>(k==="notes"?6000:240))throw Error("Texto inválido: "+k);
 if(!d.name.trim())throw Error("Ingresa un nombre para el canal.");
 for(const k of ["q","b","z","n","s","height","freeboard","vmin","vmax"])if(typeof d[k]!=="number"||!Number.isFinite(d[k]))throw Error("Revisa el valor de "+k+".");
 for(const k of ["q","n","s","height","vmax"])if(d[k]<=0)throw Error(k+" debe ser mayor que cero.");
 if(d.b<0||d.z<0||d.freeboard<0||d.vmin<0)throw Error("Las dimensiones y criterios no pueden ser negativos.");
 if(d.section!=="triangular"&&d.b<=0)throw Error("El ancho de fondo debe ser mayor que cero.");
 if(d.section!=="rectangular"&&d.z<=0)throw Error("El talud debe ser mayor que cero.");
 if(d.freeboard>=d.height)throw Error("El borde libre debe ser menor que la altura total.");
 if(d.vmin>d.vmax)throw Error("La velocidad mínima no puede superar la máxima.");
 if(d.q>1e7||d.height>1e4||d.b>1e5||d.z>1e3||d.n>1||d.s>1)throw Error("Hay valores fuera del rango de cálculo admitido.");
 return d;
}
export function geometry(d,y){
 const b=d.section==="triangular"?0:d.b,z=d.section==="rectangular"?0:d.z;
 const area=y*(b+z*y),perimeter=b+2*y*Math.sqrt(1+z*z),top=b+2*z*y;
 return {area,perimeter,top,radius:area/perimeter,depth:area/top,b,z};
}
export function discharge(d,y){if(y<=0)return 0;const a=geometry(d,y);return a.area*Math.pow(a.radius,2/3)*Math.sqrt(d.s)/d.n;}
function root(fn){let lo=0,hi=1;for(let i=0;fn(hi)<0;i++){if(i>100)throw Error("No se pudo acotar el tirante.");hi*=2;}for(let i=0;i<110;i++){const mid=(lo+hi)/2;if(fn(mid)>0)hi=mid;else lo=mid;}return (lo+hi)/2;}
export function calculate(input){
 const d=validate(input),yn=root(y=>discharge(d,y)-d.q);
 const yc=root(y=>{const a=geometry(d,y);return G*a.area**3-d.q**2*a.top;});
 const a=geometry(d,yn),velocity=d.q/a.area,fr=velocity/Math.sqrt(G*a.depth),capacity=discharge(d,d.height-d.freeboard),remaining=d.height-yn;
 const regime=Math.abs(fr-1)<=0.01?"Cercano al crítico":fr<1?"Subcrítico":"Supercrítico";
 return {...a,yn,yc,velocity,fr,capacity,remaining,regime,energy:yn+velocity**2/(2*G),shear:1000*G*a.radius*d.s,capacityOk:remaining>=d.freeboard-1e-9,velocityOk:velocity>=d.vmin&&velocity<=d.vmax,residual:Math.abs(discharge(d,yn)-d.q)};
}
