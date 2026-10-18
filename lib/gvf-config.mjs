export function gvfDefaults(value={}) {
 return {interval:10,regime:"subcritical",boundary:"depth",depth:0.5,stage:0,energySlope:0.001,contraction:0.1,expansion:0.3,tolerance:1e-7,...value};
}
export function validateGVF(value) {
 const c=gvfDefaults(value);
 if(!["subcritical","supercritical"].includes(c.regime)||!["depth","stage","normal","critical"].includes(c.boundary))throw Error("Revisa el régimen y el contorno FGV.");
 for(const k of ["interval","depth","stage","energySlope","contraction","expansion","tolerance"])if(!Number.isFinite(c[k]))throw Error("Revisa el parámetro FGV: "+k);
 if(c.interval<1e-6||c.interval>1e8)throw Error("El intervalo X de FGV debe ser positivo (mínimo 0.000001 m).");
 if(c.depth<=0||c.depth>1e5||c.energySlope<=0||c.energySlope>1||c.contraction<0||c.contraction>1||c.expansion<0||c.expansion>1||c.tolerance<1e-10||c.tolerance>1e-3)throw Error("Parámetros FGV fuera de rango.");
 return Object.fromEntries(["interval","regime","boundary","depth","stage","energySlope","contraction","expansion","tolerance"].map(k=>[k,c[k]]));
}
