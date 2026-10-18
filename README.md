# Cap_Canal v2.1
Aplicación web privada para diseñar un canal completo por progresivas, mantener varios proyectos y exportar el anexo técnico.

## Flujo en cinco pestañas
1. **Proyecto y perfil:** identificación, material/revestimiento, progresivas inicial/final, intervalo, referencia de cotas y perfil del terreno editable o pegado desde Excel.
2. **Alineamiento:** cota de fondo inicial y rasante continua por tramos; geometría opcional en planta con rectas y curvas circulares tangentes (coordenadas iniciales y azimut).
3. **Sección típica y barrajes:** geometría rectangular, trapezoidal o triangular, caudal, Manning, dimensiones, borde libre y límites de velocidad.
4. **Perfil FGV:** secciones base obligatorias, intervalo X independiente, caras de barrajes y cambios de pendiente. Tabla con procedencia, cotas, pérdidas e iteraciones. La geometría base sigue editable en el panel desplegable.
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
El perfil principal se resuelve por FGV permanente 1D y paso estándar, con caudal constante y una rama subcrítica o supercrítica. La evaluación uniforme local se conserva como referencia para la típica. No se incluyen saltos hidráulicos/régimen mixto, sobreelevación en curvas, captaciones laterales, derrames, erosión, sedimentos, excavaciones ni estabilidad estructural. El material no asigna automáticamente rugosidades ni criterios de velocidad. Los criterios son definidos por el usuario; el cumplimiento no implica aprobación integral. Ver el apartado FGV para el método, contornos y límites.

## Referencias
- USACE HEC-RAS, Uniform Flow Computations: https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/stable-channel-design-functions/uniform-flow-computations
- USBR, Water Measurement Manual, cap. 2, sección 11: https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_11.html

## Barrajes de lámina
En la pestaña Sección típica se pueden añadir hasta 20 láminas por progresiva, definidas por espesor longitudinal, cresta sobre el fondo y abertura inferior opcional. La progresiva identifica la cara aguas arriba. Cada barraje se incorpora a la malla de secciones, al perfil, al CSV y al anexo completo. Se permiten configuraciones apoyada en el fondo para rebose o levantada para paso inferior; si se supera la cresta pueden ocurrir ambos pasos.
La comprobación hidráulica manual es opcional y no alimenta FGV. Sus tirantes son ingresados por el usuario. Los coeficientes Cd se comparten con el motor FGV y sus valores iniciales son ejemplos que requieren calibración. Se usa integración hidrostática por franjas: rebose y orificio con entrada cubierta. Para orificio rectangular sumergido, Q=Cd*A*sqrt(2*g*(y1-y2)); la generalización a ancho variable requiere calibración. Se omiten velocidad de aproximación, flujo inverso y corrección por cresta gruesa. El motor FGV sí modifica el perfil e incluye interacción entre estructuras y corrección empírica de Villemonte para rebose sumergido; la comprobación manual solo admite rebose libre.
El respaldo JSON v5 separa el intervalo X de FGV del intervalo de secciones base y admite importación de v1/v2/v3/v4/v5. Al abrir versiones anteriores, X toma el intervalo base guardado. Sin migración de tablas: se conserva todo en payload.
Pruebas adicionales: node tests/barriers.test.mjs.
Referencias del elemento: https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_09.html y https://www.usbr.gov/tsc/techreferences/mands/wmm/chap09_05.html.

## Acceso público sin registro
Cualquier persona con el enlace puede calcular y exportar sin una cuenta. Los visitantes guardan proyectos en el navegador (localStorage), con control de revisión entre pestañas. El respaldo JSON permite moverlos entre equipos; no se sincronizan automáticamente. Los usuarios que inician sesión mantienen su espacio privado en línea. Las rutas API de proyectos siguen exigiendo autenticación y comprueban el propietario en cada operación. Los proyectos existentes no se publican. Pruebas: node tests/guest-projects.test.mjs.

## Publicación en GitHub Pages
La versión estática se compila con `npm run build:pages` y se publica desde `.github/workflows/pages.yml`. Funciona sin servidor, cuenta ni inicio de sesión. Los diseños se guardan exclusivamente en el navegador y se transfieren mediante JSON; los datos privados del alojamiento anterior no se incluyen ni se sincronizan. La URL prevista es https://semaloav.github.io/Cap_Canal/ y solo se considera publicada tras finalizar correctamente el trabajo deploy. El repositorio debe tener Pages configurado con Source = GitHub Actions. El workflow intenta habilitarlo; si GitHub exige permisos administrativos, se debe activar en Settings → Pages.

## Flujo gradualmente variado (FGV)

La cuarta pestaña calcula el perfil permanente 1D por paso estándar. Define régimen, contorno e intervalo; las pérdidas usan Manning y coeficientes de contracción/expansión. Los barrajes son controles internos en la rama subcrítica: se invierte su ley de descarga con el nivel aguas abajo calculado, incluyendo rebose y orificio, y corrección empírica de Villemonte para rebose sumergido. El espesor se conserva como geometría de lámina, sin fricción interior.

Requiere caudal constante y una sola familia de sección; no resuelve saltos/régimen mixto, aportes laterales ni derrames. Una incompatibilidad detiene el cálculo y deja los nodos pendientes sin resultados. Geometría y n se interpolan linealmente entre nodos durante los subpasos adaptativos. La tolerancia es numérica, no una estimación de exactitud física. Validar Cd, condiciones de contorno y sensibilidad al intervalo para cada diseño.

`node tests/gvf.test.mjs` contrasta flujo uniforme en 3 geometrías y 2 regímenes, balance de energía, integración RK4 independiente, refinamiento de malla, orificio analítico y fallos explícitos. El CSV y el anexo incluyen las iteraciones FGV. Los respaldos v1–v4 migran a v5.

### Generación y conservación de secciones

Primero se generan todas las secciones base, incluidos los extremos, por número o separación. Después se añaden los puntos del intervalo X de FGV, los quiebres de pendiente y las caras de cada barraje (progresiva y progresiva + espesor). Los puntos de terreno y planta también se conservan. Las coincidencias comparten una sección física con todas sus etiquetas; cada fila declara su origen y el resumen desglosa las adiciones sin contarlas dos veces. Cambiar X conserva las secciones base y sus ajustes geométricos.

El paso estándar usa la distancia real entre nodos y las cotas de rasante integradas por tramo. Ningún paso FGV atraviesa un cambio de pendiente sin un nodo en él. Los subpasos adaptativos aceptados se exportan como secciones adicionales con sus propios resultados. La malla se presenta aun si el perfil no converge. Si un punto base/X cae dentro de la lámina, permanece identificado sin aplicarle FGV de canal abierto: la ley del barraje enlaza sus caras. El orificio y el rebose usan niveles referidos al fondo aguas arriba, por lo que la cota aguas abajo incorpora la caída de rasante a través del espesor.

`node tests/section-mesh.test.mjs` verifica conteos, independencia de X, coincidencias, preservación de geometría, caras físicas, quiebres, refinamiento visible y balance de energía de cada paso real.
