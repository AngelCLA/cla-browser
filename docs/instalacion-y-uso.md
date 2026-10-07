# Instalacion y uso

## Requisitos

- Node.js 18 o superior.
- Una instalacion local de Chrome o Edge solo si se ejecutara el benchmark comparativo.

## Inicio rapido

Instala las dependencias y abre el navegador:

```bash
npm install
npm start
```

El comando inicia la edicion personal. Consulta la [guia de la edicion institucional](edicion-institucional.md) para cambiar de edicion.

## Navegacion

La barra de direcciones conserva las URL con `http://` o `https://`, completa los dominios con `https://` y transforma el texto libre en una busqueda de Google. Sus sugerencias combinan pestañas e historial de la sesion con sugerencias de Google.

`Ctrl/Cmd + L` tambien abre un cuadro de direccion sobre la pagina activa. Se cierra con `Enter`, `Escape` o al hacer clic fuera. Los enlaces destinados a una ventana nueva se abren en una pestaña.

Las pestañas inactivas se eliminan del arbol de vistas, por lo que solo se renderiza la pestaña activa. Se pueden reordenar sin recargar su contenido y reabrir hasta las ultimas 20 pestañas cerradas.

## Marcadores y bloqueo de contenido

Una instalacion nueva incluye Google, Google Drive y Gmail como marcadores iniciales. Se pueden eliminar y no vuelven a crearse. Los marcadores se guardan en el perfil de Electron, normalmente en Windows en `%APPDATA%/cla-browser/bookmarks.json`; por ello no se sobrescriben al actualizar la aplicacion.

El bloqueo de anuncios y rastreadores esta activo de forma predeterminada. El modo ligero bloquea dominios conocidos con un coste bajo; el modo reforzado añade patrones de URL. El escudo de la barra permite activar o desactivar el bloqueo y muestra las solicitudes bloqueadas. El menu **Bloqueador** permite cambiar de modo o permitir anuncios en el sitio actual.

Los favicons no se guardan en el archivo de marcadores: se usan los iconos publicados por cada sitio y la cache local de Chromium.

## Atajos

| Atajo | Accion |
| --- | --- |
| `Ctrl/Cmd + L` | Enfocar la barra de direcciones |
| `Ctrl/Cmd + T` | Abrir una pestaña |
| `Ctrl/Cmd + W` | Cerrar la pestaña activa |
| `Ctrl/Cmd + Shift + T` | Reabrir la ultima pestaña cerrada |
| `Ctrl/Cmd + Tab` | Siguiente pestaña |
| `Ctrl/Cmd + Shift + Tab` | Pestaña anterior |
| `Ctrl/Cmd + 1` a `8` | Ir a una pestaña por posicion |
| `Ctrl/Cmd + 9` | Ir a la ultima pestaña |
| `Ctrl/Cmd + R` o `F5` | Recargar |
| `Ctrl/Cmd + Shift + R` | Recargar sin cache |
| `Ctrl/Cmd + [` | Atras |
| `Ctrl/Cmd + ]` | Adelante |
| `Ctrl/Cmd + +` / `-` | Ampliar o reducir zoom |
| `Ctrl/Cmd + 0` | Restablecer zoom |
| `Ctrl/Cmd + rueda` | Ampliar o reducir zoom |
| `F11` | Pantalla completa de contenido |
| `Ctrl/Cmd + P` | Imprimir la pestaña activa |
| `Ctrl/Cmd + D` | Añadir o quitar un marcador |
| `Ctrl/Cmd + Shift + B` | Mostrar u ocultar la barra de marcadores |
| `Ctrl/Cmd + Shift + I` o `F12` | Alternar herramientas de desarrollador |

Para conocer la separacion entre procesos y las protecciones de las paginas externas, consulta [Arquitectura y seguridad](arquitectura-y-seguridad.md).
