# CLA Browser

Mini navegador de escritorio construido con Electron. Usa `BaseWindow` y `WebContentsView`; no utiliza APIs desaconsejadas como `BrowserView` ni etiquetas `<webview>`.

## Requisitos

- Node.js 18 o superior

## Ejecutar

```bash
npm install
npm start
```

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
| `Ctrl/Cmd + Shift + I` o `F12` | Alternar herramientas de desarrollador |

## Arquitectura

```text
src/
  assets/             Recursos compartidos, como logos SVG.
  main/               Proceso principal de Electron.
    index.js           Ventana, pestañas, navegación, menú, zoom e IPC.
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
