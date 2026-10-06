# CLA Browser

Mini navegador de escritorio construido con Electron. Usa `BaseWindow` y `WebContentsView`; no utiliza APIs desaconsejadas como `BrowserView` ni etiquetas `<webview>`.

## Requisitos

- Node.js 18 o superior

## Ejecutar

```bash
npm install
npm start
```

La edición personal es la predeterminada. Para probar la nueva pestaña de la edición institucional, inicia Electron con `CLA_EDITION=institutional` en el entorno. En PowerShell:

```powershell
$env:CLA_EDITION = 'institutional'
npm start
```

Para volver a la edición personal en la misma terminal de PowerShell:

```powershell
Remove-Item Env:CLA_EDITION
npm start
```

La edición personal también se usa automáticamente al abrir una terminal nueva y ejecutar `npm start`.

La edición institucional carga `institutional.config.json` desde la raíz. Modifica `organizationName`, `accentColor` y la ruta relativa de `logo` para personalizarla. El logo de muestra está en `src/assets/institutional/logo.svg`; `appIcon` queda preparado para el empaquetado del instalador.

Para restringir navegaciones en esa edición, añade dominios a `blockedSites`. Se bloquea el dominio y sus subdominios, y se muestra una página local de “Sitio restringido”. No se bloquean recursos secundarios de sitios permitidos.

```json
{
  "blockedSites": ["facebook.com", "youtube.com"]
}
```

La edición institucional también cancela descargas de instaladores reconocibles de otros navegadores, plataformas de juegos y juegos populares por su nombre y extensión, sin bloquear los dominios desde los que se descargan.

La edición institucional conserva historial local durante cuatro meses en `userData/history.json`. No hay botón ni entrada de menú para abrirlo: usa `Ctrl/Cmd + H`. El historial se expone solo a su página local; no se comparte con sitios web. Como cualquier archivo de perfil local, no está cifrado y debe protegerse con las cuentas y permisos del sistema operativo.

## Benchmark de rendimiento

La suite compara CLA Browser con Chrome, Edge y Firefox de Playwright. Mide arranque, carga de navegacion, FCP, LCP cuando el motor lo expone, recursos, interaccion guionizada, operaciones de pestanas y recursos del proceso en Windows.

Instala una vez el Firefox administrado por Playwright:

```bash
npx playwright install firefox
```

Chrome y Edge se usan desde sus instalaciones locales. Ejecuta una pasada completa con perfiles temporales, cache fria y caliente, escenarios locales y sitios reales:

```bash
npm run benchmark -- --runs 12
```

La pasada por defecto usa cinco repeticiones para una comprobacion mas rapida. Para una prueba local breve de CLA Browser:

```bash
npm run benchmark -- --browsers cla --scenarios local --runs 1
```

Opciones disponibles:

```text
--browsers cla,chrome,edge,firefox
--cache cold,warm
--runs 12
--scenarios local,real
--sites ruta/a/sitios.json
--output directorio/de/salida
--headless
```

Los sitios reales configurados estan en `bench/sites.json`. Sustituyelos por entre tres y cinco URLs que representen el uso habitual antes de comparar resultados. Las cargas reales se informan separadas de los escenarios locales porque red, CDN y contenido remoto no son deterministas.

Cada ejecucion crea `benchmark-results/<fecha>/` con:

- `raw.ndjson`: cada observacion individual y sus errores.
- `summary.json`: mediana, p95, minimo y maximo agrupados por navegador, escenario y cache.
- `summary.csv`: datos aptos para Excel u otra herramienta de graficos.
- `environment.json`: version de Node, CPU, RAM, sistema y viewport usados.

No compares un valor unico como si fuera una clasificacion absoluta. CLA Browser usa Chromium incluido en Electron: las metricas de carga web se deben leer junto con la version de Chromium registrada, mientras que arranque, pestanas y memoria miden el coste del shell de escritorio.

## Funciones

- Pestaña inicial local con el logo de CLA.
- Barra de direcciones que conserva `http://` o `https://`, completa dominios con `https://` y convierte texto libre en una búsqueda de Google.
- Sugerencias de dirección que combinan pestañas e historial de la sesión con sugerencias de búsqueda de Google.
- `Ctrl/Cmd + L` abre un cuadro de dirección centrado sobre la página activa, con hasta tres sugerencias de Google o una sugerencia de navegación para URLs. Se cierra con `Enter`, `Escape` o clic fuera.
- Pestañas con título, URL, indicador de carga y reapertura de las últimas 20 pestañas cerradas.
- Reordenamiento de pestañas mediante arrastre, sin recargar su contenido.
- Enlaces con destino de ventana nueva se interceptan y se abren como pestañas.
- Navegación atrás, adelante, recarga normal y recarga sin caché.
- Menú contextual nativo con navegación, acciones de enlace, edición y “Inspeccionar”.
- Zoom de la pestaña activa por teclado y con `Ctrl/Cmd + rueda`.
- Controles personalizados para minimizar, maximizar/restaurar y cerrar.
- Scroll oscuro de CLA Browser cuando el sitio no aporta uno propio. Las reglas del sitio prevalecen sobre el estilo predeterminado.
- El navegador usa el modo oscuro de forma predeterminada: las páginas que respetan `prefers-color-scheme` y sus favicons se cargan con su variante oscura.
- Marcadores persistentes: la estrella añade o quita la página activa y la barra permite abrirlos.

### Marcadores

En una instalación nueva se crean tres marcadores iniciales: Google, Google Drive y Gmail. Son solo valores iniciales: se pueden eliminar y no reaparecen al iniciar el navegador.

El listado editable se guarda en `userData/bookmarks.json` de Electron, no en el directorio de la aplicación. En Windows corresponde normalmente a `%APPDATA%/cla-browser/bookmarks.json`. Esto evita que una actualización sobrescriba los marcadores del usuario.

El `bookmarks.json` de la raíz contiene los valores iniciales para instalaciones nuevas. Si se detecta una instalación anterior, sus marcadores se migran una única vez a `userData`, se eliminan favicons Base64 y se descartan URLs duplicadas.

Cada registro necesita `title` y `url`. `id` y `category` son opcionales y permiten clasificar marcadores en futuras ediciones institucionales sin afectar la interfaz actual.

```json
[
  {
    "id": "google",
    "title": "Google",
    "url": "https://www.google.com/",
    "category": "search"
  }
]
```

Los favicons no se escriben en el archivo de marcadores. CLA Browser usa el icono anunciado por cada sitio mientras está disponible y el caché local de Chromium; prueba `/favicon.ico` como respaldo y muestra un icono genérico si la descarga falla.

## Controles

La barra superior contiene las pestañas, controles de navegación, dirección y controles de ventana. Las pestañas inactivas se desmontan del árbol de vistas para que solo la activa se renderice.

El zoom se aplica exclusivamente a la pestaña activa y cuenta con límites para evitar escalas extremas.

## Atajos

| Atajo | Acción |
| --- | --- |
| `Ctrl/Cmd + L` | Enfocar la barra de direcciones |
| `Ctrl/Cmd + T` | Abrir una pestaña |
| `Ctrl/Cmd + W` | Cerrar la pestaña activa |
| `Ctrl/Cmd + Shift + T` | Reabrir la última pestaña cerrada |
| `Ctrl/Cmd + Tab` | Siguiente pestaña |
| `Ctrl/Cmd + Shift + Tab` | Pestaña anterior |
| `Ctrl/Cmd + 1` a `8` | Ir a una pestaña por posición |
| `Ctrl/Cmd + 9` | Ir a la última pestaña |
| `Ctrl/Cmd + R` o `F5` | Recargar |
| `Ctrl/Cmd + Shift + R` | Recargar sin caché |
| `Ctrl/Cmd + [` | Atrás |
| `Ctrl/Cmd + ]` | Adelante |
| `Ctrl/Cmd + +` / `-` | Ampliar o reducir zoom |
| `Ctrl/Cmd + 0` | Restablecer zoom |
| `Ctrl/Cmd + rueda` | Ampliar o reducir zoom |
| `F11` | Pantalla completa de contenido, sin barra superior |
| `Ctrl/Cmd + P` | Imprimir la pestaña activa |
| `Ctrl/Cmd + D` | Añadir o quitar un marcador de la página activa |
| `Ctrl/Cmd + Shift + B` | Mostrar u ocultar la barra de marcadores |
| `Ctrl/Cmd + Shift + I` o `F12` | Alternar herramientas de desarrollador |

## Arquitectura

```text
src/
  assets/             Recursos compartidos, como logos SVG.
  main/               Proceso principal de Electron.
    index.js           Ventana, pestañas, navegación, menú, zoom e IPC.
    bookmarks.js       Defaults, normalización, deduplicación y migración de marcadores.
  preload/            Código aislado que corre antes que cada renderer.
    toolbar.js         Puente mínimo con contextBridge para la interfaz local.
    page.js            Atajos y rueda de zoom, sin API expuesta a los sitios.
  renderer/           Interfaces locales cargadas en WebContentsView.
    toolbar/           Barra superior, pestañas y controles de ventana.
    new-tab/           Página de nueva pestaña con el logo CLA.
```

Cada pestaña externa usa su propia `WebContentsView`. Al cambiar de pestaña, la anterior se elimina con `removeChildView` y la activa ocupa el área bajo la barra. En cada redimensionado, los límites de todas las vistas se recalculan.

## Seguridad

Las páginas externas se cargan con `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true`. El único IPC desde una página externa es una solicitud de zoom emitida internamente por `src/preload/page.js`; el proceso principal verifica que provenga de la pestaña activa antes de atenderla.

No hay APIs de Node.js disponibles para las páginas web cargadas en las pestañas.
