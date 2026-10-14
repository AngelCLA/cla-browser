# CLA Browser

Navegador de escritorio basado en Electron. Usa `BaseWindow` y `WebContentsView`; no utiliza `BrowserView` ni etiquetas `<webview>`.

## Inicio rapido

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

## Documentacion

- [Instalacion y uso](docs/instalacion-y-uso.md): funciones, marcadores, bloqueo de contenido y atajos.
- [Edicion institucional](docs/edicion-institucional.md): configuracion, restricciones e historial.
- [Benchmark de rendimiento](docs/benchmark.md): preparacion, ejecucion e interpretacion de resultados.
- [Arquitectura y seguridad](docs/arquitectura-y-seguridad.md): estructura, persistencia, procesos y protecciones.

## Desarrollo

```bash
npm test
```

## Windows packaging

Build the portable executable and NSIS installer together on Windows. Node.js and npm must be installed first; the build dependencies are installed with `npm install`.

```bash
npm run build:win
```

The generated, git-ignored files are:

- `dist/CLA Browser.exe` — portable app
- `dist/CLA Browser Setup.exe` — installer
