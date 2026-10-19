# Cap_Canal v3

Aplicación de cálculo para un canal experimental con rebose de entrada, rama supercrítica, salto hidráulico, rama subcrítica y rebose de salida.

Aplicación pública: https://semaloav.github.io/Cap_Canal/

## Seis pestañas

1. **Proyecto:** identificación, material, tipo de sección, referencia de cotas y terreno opcional.
2. **Condiciones hidráulicas:** caudal constante, Manning, dimensiones, altura y borde libre; extensión, malla de diseño, fondo inicial y pendientes por tramo; planta opcional; barrajes de entrada y salida y sus secciones de aproximación.
3. **Entrada · P0 y P1:** Cd de entrada, carga de rebose, nivel de aproximación y cálculo de P1 por energía con pérdida explícita o por tirante medido. Se puede indicar salto directo en el impacto, sin fabricar un P1 hidrostático.
4. **Tablas FGV:** rama supercrítica aguas abajo con progresiva y tirante iniciales manuales; rama subcrítica aguas arriba desde la aproximación al barraje de salida. Cada rama tiene su propio N y X. El botón «Usar resultado del punto 1» copia esos datos una vez y permite modificarlos posteriormente.
5. **Salto hidráulico:** buscar una posición compatible o comprobar un P2 manual. P3 = P2 + Lj. Lj puede ser medido o calcularse con la correlación de Elevatorski, Lj = 6.9(y conjugado − y2), bajo las hipótesis de salto clásico rectangular. Se verifica cantidad de movimiento, régimen y pérdida positiva de energía.
6. **Reporte y anexo:** hipótesis y coeficientes, condiciones de entrada y salida, geometría, ambas tablas FGV, diagnóstico del salto, perfil con puntos 0–4, impresión/PDF, CSV y respaldo JSON.

## Condiciones de cálculo

- Unidades SI y progresivas en metros, presentadas con seis decimales cuando corresponde a láminas o puntos insertados.
- Secciones rectangular, trapezoidal o triangular. Caudal constante en ambas ramas, incluso si un respaldo antiguo conserva ajustes locales de Q.
- La rasante es única: Z(x) = Z inicial − integral de S por tramos. Nunca se reinicia al comenzar una rama.
- En esta versión las pendientes admitidas son positivas, hasta 1 m/m, en el sentido creciente de progresiva. Manning y el tirante normal son referencias de flujo uniforme; no sustituyen el perfil FGV.
- El material no asigna automáticamente Manning ni límites de velocidad.
- La geometría local se interpola desde la malla de diseño; modificar X no cambia sus anclajes.

### Rebose y entrada

Los dos controles terminales utilizan rebose rectangular libre de lámina delgada, con napa ventilada:

`Q = (2/3) Cd bw sqrt(2g) H^(3/2)`

La cresta se refiere al fondo de la lámina; la aproximación tiene su propia progresiva. El ancho efectivo y Cd deben representar el montaje y requieren validación/calibración. Se omite la velocidad de aproximación en esta ley; se informa V²/(2gH). La alerta del 5 % es orientativa y no una garantía de validez. Una sección de aproximación coincidente con la lámina es una idealización que debe justificarse.

Con V0 ≈ 0, la energía disponible en P1 es `eta0 − he`. P1 se obtiene resolviendo `Z1 + y1 + Q²/(2g A1²) = eta0 − he` en la rama supercrítica, con alfa = 1. **Cd no determina he.** he = 0 es el caso ideal sin pérdidas. Un tirante medido permite inferir la pérdida; se rechazan ganancias de energía. No se modela la napa en caída como FGV.

### FGV y malla

El paso estándar resuelve `Eu − Ed − hf − hlocal = 0`, con `hf = (Sfu + Sfd) L/2`, `Sf = [nQ/(A R^(2/3))]²` y L positivo. El avance de progresiva es negativo en el cálculo subcrítico hacia aguas arriba. Se itera por bisección dentro del régimen solicitado, con refinamiento adaptativo cuando se necesita.

N incluye la sección inicial: hay N−1 intervalos regulares. Se admiten 2–2000 secciones regulares por rama. Se conservan los nodos de diseño situados dentro de su alcance y se añaden caras de elementos, quiebres y refinamientos. Las coincidencias se cuentan una vez por rama. La malla de diseño admite hasta 1000 nodos; el refinamiento tiene un límite de 20000 filas.

Las tablas pueden compartir progresivas con tirantes distintos. Los resultados de las zonas superpuestas son ramas independientes, no dos niveles físicos simultáneos. No se recorta silenciosamente una rama que excede el alineamiento. Un contorno incompatible deja sus filas sin resultados.

Los elementos interiores anteriores se mantienen en Condiciones hidráulicas. Se resuelven en la rama subcrítica como controles de rebose/orificio, con corrección empírica de Villemonte para rebose sumergido. El cruce supercrítico de un control interior se detiene con diagnóstico. Dentro del espesor de una lámina no se aplica FGV.

### Salto hidráulico

Se utiliza `M = Q²/(gA) + b y²/2 + z y³/3`, beta = 1. La profundidad conjugada local se calcula numéricamente; para rectangular coincide con Bélanger. La búsqueda compara los estados en **x2 y x3 = x2 + Lj**, y recalcula ambos extremos con FGV, sin aceptar una mera interpolación como solución final.

El balance es `M3 − M2 = F externa neta/(rho g)`, con fuerza positiva aguas abajo. El usuario debe especificar esta fuerza o declarar justificable despreciar peso y fricción. Esta última hipótesis no es universal para saltos de longitud finita o pendiente apreciable. La búsqueda exige geometría prismática, sin controles interiores en el salto. No se calculan fuerzas de una transición, el impacto de la napa ni el detalle interno del salto.

La tolerancia relativa de compatibilidad de momento es 1e−5. Se exige pérdida de energía positiva. Si hay varias ubicaciones candidatas, se solicita comprobar P2 manualmente; no se elige una arbitrariamente. El perfil conectado interrumpe FGV dentro del salto. El inicio manual de la rama supercrítica puede diferir del P1 calculado y permanece identificado como tal.

## Guardado y acceso

GitHub Pages funciona sin servidor ni cuenta. Los proyectos se guardan en localStorage, con revisión para proteger cambios concurrentes. El JSON permite trasladarlos a otro navegador o equipo; no hay sincronización automática. Se importan respaldos v1–v6 y se guardan como v6, conservando geometría, ajustes y configuración FGV anterior. La nueva configuración se almacena en `flume`.

El código del alojamiento anterior y sus rutas autenticadas se conservan para compatibilidad; no se incluyen datos privados en el paquete estático ni se modifica aquel alojamiento.

## Desarrollo y publicación

Node 24 recomendado. Instalación: `npm ci --include=dev --include=optional --no-audit --no-fund`.

- Tipos: `npx tsc --noEmit`.
- Pruebas: `node --test tests/*.test.mjs` (la prueba de Pages requiere compilar antes).
- Compilación pública: `npm run build:pages`.
- Validación del paquete: `node tests/pages-build.test.mjs`.

`.github/workflows/pages.yml` comprueba cálculos, migración, guardado, interfaz SSR, tipos y paquete estático; publica en GitHub Pages tras un push a main. La URL se considera actualizada cuando el trabajo deploy termina correctamente. Las verificaciones automatizadas no sustituyen la calibración del modelo físico ni una revisión visual en navegador.

## Referencias

- USBR, Water Measurement Manual: https://www.usbr.gov/tsc/techreferences/mands/wmm/chap02_09.html
- USACE, ecuación de energía: https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/equations-for-basic-profile-calculations
- USACE, régimen mixto y fuerza específica: https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.1/overview-of-optional-capabilities/mixed-flow-regime-calculations

No se incluyen aportes laterales, derrames con reducción de Q, sobreelevación en curvas, sedimentos ni estabilidad estructural. Los resultados no constituyen una aprobación integral del canal.

### Ubicación por curvas FGV y tirante conjugado (pestaña 5)

Selecciona «Calculada · Lj = 6.9 (y conjugado − y2)» para buscar P2 desde aguas arriba. En cada progresiva se obtiene y2 de la curva supercrítica, se calcula el conjugado por cantidad de movimiento y se estima Lj. P3 se ubica en x2 + Lj; el residuo es R(x2) = y_sub(x3) − y_conjugado. No se compara el conjugado con la curva subcrítica en x2. Un cambio de signo permite refinar mediante bisección, con tolerancia absoluta de tirante de 1e−6 m y resolución de progresiva de 1e−6 m.

Los puntos entre filas se resuelven con paso estandar FGV. Los extremos aceptados se recalculan en las ramas completas. El gráfico superior siempre superpone ambas curvas por nivel Z+y; las tarjetas muestran progresiva, fondo, tirante, nivel, velocidad y Froude de P2 y P3. Se informa la longitud calculada, diferencia de tirantes, pérdida de energía, caída del fondo y traza de iteraciones. Las parejas no compatibles se identifican como ensayos. El perfil conectado mantiene una interrupción dentro del salto.

Esta opción solo admite sección rectangular prismática, sin barrajes dentro del salto, y requiere declarar justificables la pendiente suficientemente pequeña y el desprecio de peso/fricción. No se aplica automáticamente a otras geometrías. La longitud medida y el balance general anterior permanecen disponibles; los proyectos anteriores conservan ese método. La correlación no sustituye la calibración del modelo físico.

Referencia: Gomes, Marzec y Endres (2019), tabla 2, correlación de Elevatorski: https://new.scielo.br/j/rbrh/a/XVJznmF994wFdHwQ8wgXXRs/?ilang=pt_BR&lang=en

Prueba adicional: node tests/jump-location.test.mjs verifica conjugado analítico, longitud variable, coincidencia en P3, extremos recalculados, cobertura insuficiente, compatibilidad manual y migración.

### Diagnóstico y verificación de la coincidencia

La búsqueda evalúa los puntos entre filas mediante un paso estándar desde la sección calculada adyacente, respetando la dirección de integración y la rasante global; no interpola linealmente el tirante para decidir los cambios de signo. Los candidatos aceptados se verifican nuevamente en las ramas completas.

Los diagnósticos distinguen cobertura insuficiente, falta de coincidencia de tirantes, coincidencia con energía incompatible y solución compatible. La energía se verifica únicamente después de cumplir la tolerancia del tirante. Una pareja de ensayo sin coincidencia mantiene la energía como «no evaluada», aunque su diferencia de energías sea negativa. Se informan R mínimo/máximo y advertencias de P3 fuera de cobertura, sin extrapolar ni modificar N/X automáticamente. La prueba de regresión reproduce las coberturas 0.015–0.965 m y 0.550–1.500 m.
