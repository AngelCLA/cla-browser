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

### Choose CLA Browser as the Windows default

Run `CLA Browser Setup.exe` to install the app. The installer registers CLA Browser
in the same user/machine context as the installation; it does not change your defaults.
Open **Settings → Apps → Default apps → CLA Browser** and choose **Set default**
where available, or select CLA Browser for **HTTP**, **HTTPS**, **.htm**, and **.html**
individually (the exact controls vary by Windows version).

Links and HTML files open in tabs in the existing CLA Browser window, or start it
when it is not running. HTML file paths containing spaces or `#` are supported.
Uninstalling removes this installation's owned browser registrations; use Windows
Settings to choose another default if necessary. The portable executable does not
register itself in Default apps. A locally built installer still needs validation
on a test Windows system before this integration is considered verified end to end.
