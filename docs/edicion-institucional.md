# Edicion institucional

La edicion institucional habilita la personalizacion para una organizacion, el bloqueo de navegaciones configuradas, restricciones sobre ciertas descargas y un historial local.

## Iniciar la edicion

Define `CLA_EDITION=institutional` antes de iniciar Electron. En PowerShell:

```powershell
$env:CLA_EDITION = 'institutional'
npm start
```

Para volver a la edicion personal en la misma terminal:

```powershell
Remove-Item Env:CLA_EDITION
npm start
```

Una terminal nueva inicia la edicion personal si no se define la variable.

## Configuracion

La aplicacion carga `institutional.config.json` desde la raiz del proyecto. Los campos utilizados en tiempo de ejecucion son:

| Campo | Descripcion |
| --- | --- |
| `organizationName` | Nombre mostrado por la edicion institucional. |
| `logo` | Ruta relativa, dentro del proyecto, a un logo local. |
| `accentColor` | Color hexadecimal de seis digitos, por ejemplo `#0054A2`. |
| `blockedSites` | Lista de dominios cuya navegacion principal se bloqueara. |

Ejemplo minimo:

```json
{
  "organizationName": "Mi institucion",
  "logo": "src/assets/institutional/logo.svg",
  "accentColor": "#0054A2",
  "blockedSites": ["facebook.com", "youtube.com"]
}
```

Las entradas de `blockedSites` aceptan dominios o URL. Se normalizan al nombre de host, se eliminan duplicados y el bloqueo abarca sus subdominios. Por ejemplo, `example.com` tambien bloquea `www.example.com`. Solo se bloquean las navegaciones principales: los recursos secundarios de sitios permitidos no se bloquean mediante esta lista.

Las rutas de `logo` deben ser relativas y permanecer dentro del directorio de la aplicacion. Si falta el archivo o la ruta no es valida, se usa el aspecto predeterminado.

`appIcon` y `bookmarks`, presentes en el archivo de ejemplo, no se consumen actualmente en tiempo de ejecucion. `appIcon` esta reservado para el empaquetado del instalador.

## Descargas restringidas

La edicion cancela descargas de instaladores reconocibles de otros navegadores, plataformas de juegos y juegos populares, por nombre y extension. No bloquea los dominios desde los que se descargan.

## Historial

El historial solo se conserva en esta edicion. Se guarda en `userData/history.json`, normalmente bajo el perfil de Electron, durante cuatro meses y con un maximo de 10.000 entradas. Se abre con `Ctrl/Cmd + H` desde una pagina externa.

La pagina de historial es local y los datos no se comparten con los sitios web. El archivo no esta cifrado; protege el perfil del sistema operativo con las cuentas y permisos adecuados.
