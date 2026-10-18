# Cap_Canal v2
Aplicación web privada para diseñar un canal completo por progresivas, mantener varios proyectos y exportar el anexo técnico.

## Flujo en cinco pestañas
1. **Proyecto y perfil:** identificación, material/revestimiento, progresivas inicial/final, intervalo, referencia de cotas y perfil del terreno editable o pegado desde Excel.
2. **Alineamiento:** cota de fondo inicial y rasante continua por tramos; geometría opcional en planta con rectas y curvas circulares tangentes (coordenadas iniciales y azimut).
3. **Sección típica:** geometría rectangular, trapezoidal o triangular, caudal, Manning, dimensiones, borde libre y límites de velocidad.
4. **Secciones:** malla por progresivas con la típica aplicada; edición de parámetros por celda, materiales/observaciones en Detalle, restauración a la típica, cotas y resultados por sección.
5. **Exportar anexo:** memoria completa imprimible en PDF (A4 horizontal), tablas de todas las secciones, CSV y respaldo del proyecto en JSON.

Los proyectos existentes de v1 se abren sin perder sus parámetros. Se les añade una malla inicial de 0 a 100 m, intervalo de 10 m y cota inicial 0 m; estos valores son editables y deben reemplazarse con los del proyecto.

## Cálculo y herencia
- Unidades SI, progresivas en metros, formato km+mmm.mm.
- Secciones en inicio/fin, intervalo nominal, puntos del terreno y quiebres del alineamiento. Máximo 1000 secciones.
- Terreno interpolado linealmente, sin extrapolación.
- Fondo continuo: cota inicial menos la integral de las pendientes por tramo; descenso positivo.
- Manning, tirante crítico, velocidad, Froude y capacidad con borde libre por sección de flujo uniforme local.
- En quiebres se usa la pendiente del tramo siguiente; en el extremo final, la anterior.
- Cambiar la típica modifica solo campos heredados. Los ajustes locales permanecen hasta restaurarlos.
- Los ajustes que quedan fuera de una malla modificada se conservan, se señalan y pueden limpiarse explícitamente.
- Rectas y curvas circulares en planta mediante integración de la tangente: azimut desde el norte en sentido horario. No incluye clotoides, transformación geodésica ni validación hidráulica de curvas.

## Persistencia y acceso
El código está en este repositorio privado; los proyectos se guardan en D1 con la vinculación DB y se autorizan por usuario autenticado en Sites. Se mantiene control de revisión para evitar sobrescribir cambios concurrentes. El esquema existente conserva el proyecto completo en payload JSON, sin migración de tablas adicional para v2. El cuerpo de cada proyecto se limita a 750 kB.

## Desarrollo
Node 22.13 o superior. npm ci; npm run dev; npm run build.
Cuando cambie el esquema: npm run db:generate. Las migraciones están en drizzle/.
Pruebas: node tests/hydraulics.test.mjs y node tests/project.test.mjs.
La publicación usa el flujo de Sites y conserva .openai/hosting.json.

## Alcance
Canal prismático por sección, flujo permanente uniforme local; pendiente de energía aproximada por la rasante. Las cotas de agua NO son una solución de remanso. No se incluyen transiciones hidráulicas/geométricas entre secciones, sobreelevación en curvas, pérdidas locales, captaciones laterales, erosión, sedimentos, excavaciones ni estabilidad estructural. El material no asigna automáticamente rugosidades ni criterios de velocidad. Los criterios son definidos por el usuario; el cumplimiento no implica aprobación integral.

## Referencias
- USACE HEC-RAS, Uniform Flow Computations: https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/stable-channel-design-functions/uniform-flow-computations
- USBR, Water Measurement Manual, cap. 2, sección 11: https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_11.html
