# Arquitectura y seguridad

## Estructura

```text
src/
  assets/             Recursos compartidos, como logos e iconos.
  main/               Proceso principal de Electron.
    index.js           Ventana, pestañas, navegacion, menu, zoom e IPC.
    bookmarks.js       Valores iniciales, normalizacion y migracion de marcadores.
    edition.js         Configuracion y reglas de la edicion institucional.
    history.js         Retencion y normalizacion del historial.
    ad-blocker.js      Reglas y preferencias del bloqueador.
    benchmark.js       API interna para la suite de rendimiento.
  preload/            Codigo aislado que se ejecuta antes de cada renderer.
    toolbar.js         Puente minimo para la interfaz local.
    page.js            Atajos y rueda de zoom para paginas externas.
  renderer/           Interfaces locales cargadas en WebContentsView.
    toolbar/           Barra superior, pestañas y controles de ventana.
    new-tab/           Pagina de nueva pestaña.
    history/           Pagina local de historial institucional.
    restricted/        Pagina de sitio restringido.
bench/                Ejecutor, servidor y fixtures del benchmark.
test/                 Pruebas unitarias y de integracion con node:test.
```

## Vistas y pestañas

La ventana usa `BaseWindow` y cada pagina externa tiene su propia `WebContentsView`; no se usan `BrowserView` ni etiquetas `<webview>`. La barra es otra vista local independiente.

Al cambiar de pestaña, la vista anterior se quita del arbol de vistas con `removeChildView` y se inserta la activa. Al redimensionar, se recalculan los limites de todas las vistas. La barra de marcadores y las sugerencias de direccion ajustan la altura disponible para el contenido.

## Persistencia

Los marcadores se guardan en `userData/bookmarks.json`. Al iniciar, la aplicacion puede migrar una unica vez marcadores antiguos desde la raiz o desde `browser-data.json`; en ese proceso elimina favicons Base64 y URL duplicadas.

Las preferencias de la barra de marcadores y del bloqueador se almacenan en `userData/browser-data.json`. El historial institucional se guarda por separado en `userData/history.json`.

## Modelo de seguridad

Las paginas externas se crean con estas preferencias:

```js
{
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

No se exponen APIs de Node.js a los sitios web. El preload de las paginas externas solo admite las acciones internas necesarias para atajos y zoom. El proceso principal comprueba que las solicitudes de zoom y las acciones de navegacion procedan de la pestaña activa; tambien limita el historial a su pagina local institucional.

Las interfaces locales usan un puente `contextBridge` limitado. Los filtros de solicitudes y las politicas de descargas se instalan en la sesion predeterminada desde el proceso principal.

## Pruebas

Ejecuta la suite con:

```bash
npm test
```

Las pruebas usan el ejecutor integrado `node:test` e incluyen la logica de marcadores, historial, ediciones, bloqueador, estadisticas y servidor del benchmark.
