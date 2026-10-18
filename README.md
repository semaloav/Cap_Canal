# Cap_Canal
Aplicación web privada para crear, editar, duplicar y eliminar diseños de canales abiertos, guardarlos en línea y generar anexos técnicos imprimibles en PDF.

## Funciones
- Canales rectangulares, trapezoidales y triangulares en unidades SI.
- Tirante normal por Manning, tirante crítico, velocidad, Froude, geometría hidráulica, capacidad con borde libre y esfuerzo cortante medio.
- Sección gráfica, curva caudal–tirante y verificaciones según criterios introducidos por el usuario.
- Reporte/anexo con identificación, entradas, ecuaciones, resultados, gráfico, observaciones y referencias.
- Guardado por usuario con protección contra cambios simultáneos; exportación e importación de un diseño en JSON.

## Alcance
Flujo permanente uniforme en canales prismáticos. La pendiente de energía se aproxima por la pendiente longitudinal. El borde libre y los límites de velocidad son criterios ingresados por el usuario, no valores normativos automáticos. No se modelan remansos, transiciones, captaciones laterales, transporte de sedimentos, erosión ni estabilidad estructural. La verificación de capacidad y velocidad no constituye una aprobación integral del diseño. Manning es empírico; en canales pequeños debe revisarse su aplicabilidad según rugosidad y régimen de flujo.

## Desarrollo
Node 22.13 o superior. Ejecutar npm ci, npm run db:generate cuando se cambie el esquema y npm run dev. Las instrucciones de ejecución del starter están en scripts/. La base D1 usa la vinculación DB; las migraciones están en drizzle/. La autenticación privada la provee Sites.
Pruebas: node tests/hydraulics.test.mjs.
Producción: npm run build; publicar mediante el flujo de Sites conservando .openai/hosting.json. El repositorio privado conserva el código; los registros de diseños están en la base de datos en línea, no en GitHub.

## Referencias
- USACE HEC-RAS, Uniform Flow Computations: https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/stable-channel-design-functions/uniform-flow-computations
- USBR, Water Measurement Manual, capítulo 2, sección 11: https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_11.html
