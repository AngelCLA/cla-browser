# Benchmark de rendimiento

La suite compara CLA Browser con Chrome, Edge y Firefox mediante Playwright. Mide inicio, navegacion, FCP, LCP cuando el motor lo expone, recursos, interaccion guionizada, operaciones de pestañas y recursos de proceso en Windows.

## Preparacion

Instala las dependencias del proyecto y, una sola vez, el Firefox administrado por Playwright:

```bash
npm install
npx playwright install firefox
```

Chrome y Edge se obtienen de sus instalaciones locales. Si no estan disponibles, excluyelos con `--browsers`.

## Ejecutar

La configuracion predeterminada ejecuta cinco repeticiones, con cache fria y caliente, escenarios locales y sitios reales:

```bash
npm run benchmark
```

Una pasada comparativa mas amplia:

```bash
npm run benchmark -- --runs 12
```

Una comprobacion local corta de CLA Browser:

```bash
npm run benchmark -- --browsers cla --scenarios local --runs 1
```

Opciones:

```text
--browsers cla,chrome,edge,firefox
--cache cold,warm
--runs 5
--scenarios local,real
--sites ruta/a/sitios.json
--output directorio/de/salida
--headless
```

Usa `npm run benchmark -- --help` para ver la sintaxis desde el ejecutable.

## Escenarios y sitios reales

Los escenarios locales prueban renderizado, carga pesada, interaccion y ciclo de pestañas en un servidor local. Los sitios reales se leen de `bench/sites.json`; cada entrada requiere `name` y `url`:

```json
{
  "sites": [
    { "name": "sitio-ejemplo", "url": "https://example.com/" }
  ]
}
```

Sustituye la lista por entre tres y cinco URL representativas antes de comparar resultados. Interpreta las cargas reales por separado, ya que red, CDN y contenido remoto no son deterministas.

## Resultados

Cada ejecucion crea `benchmark-results/<fecha>/` por defecto, con:

| Archivo | Contenido |
| --- | --- |
| `raw.ndjson` | Observaciones individuales y errores. |
| `summary.json` | Mediana, p95, minimo y maximo por navegador, escenario y cache. |
| `summary.csv` | Datos para Excel u otras herramientas de graficos. |
| `environment.json` | Version de Node, CPU, RAM, sistema y viewport. |

No interpretes un unico valor como una clasificacion absoluta. CLA Browser usa el Chromium incluido en Electron: las metricas de carga web deben leerse junto a la version de Chromium registrada. Las metricas de inicio, pestañas y memoria incluyen el coste del shell de escritorio.
