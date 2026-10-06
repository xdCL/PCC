# Presenta PDF

Convierte cualquier PDF local en una presentación a pantalla completa directamente desde tu navegador.

Presenta PDF es una aplicación web estática pensada para proyectar documentos sin pasos intermedios: arrastra un PDF, espera unos segundos y presenta cada página como una diapositiva. No necesita cuenta, backend ni servicios externos.

## Privacidad

**El archivo nunca abandona tu dispositivo.**

El documento se lee con la File API del navegador y se interpreta localmente con PDF.js. No se incluye ningún sistema de subida, analítica, tracker, almacenamiento remoto ni persistencia en `localStorage`, IndexedDB o cookies. Las páginas renderizadas y las contraseñas de documentos protegidos existen únicamente en memoria durante la sesión.

## Características

- Arrastrar y soltar o seleccionar un PDF.
- Presentación nítida a pantalla completa.
- Navegación por teclado y selector de página.
- Miniaturas con renderizado diferido.
- Ajuste a pantalla, ajuste al ancho y zoom manual.
- Puntero láser virtual.
- Temporizador con inicio, pausa y reinicio.
- Pantalla negra o blanca sin cambiar de página.
- Gestos táctiles para avanzar y retroceder.
- Diseño responsive para notebook, tablet y celular.
- Caché acotada a las páginas cercanas para no agotar la memoria.
- Solicitud local de contraseña para PDFs protegidos.

## Requisitos

- Node.js 22.13 o superior (se recomienda Node.js 22 LTS).
- npm 10 o superior.
- Un navegador moderno con soporte para módulos ES, Canvas y Web Workers.

## Desarrollo local

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

Para generar y revisar la versión de producción:

```bash
npm run build
npm run preview
```

Los archivos estáticos se generan en `dist/`. La configuración usa rutas relativas (`base: './'`), por lo que funciona tanto en un dominio raíz como en una ruta de proyecto del tipo `https://usuario.github.io/nombre-repositorio/`.

Los scripts `predev` y `prebuild` copian automáticamente el worker de PDF.js y las tipografías WOFF2 desde las dependencias instaladas a los assets locales. La interfaz usa Fraunces Variable, Plus Jakarta Sans Variable e IBM Plex Mono. No se consulta ningún CDN en desarrollo ni en producción.

## Atajos

| Acción | Atajo |
|---|---|
| Siguiente | `→` / `↓` / `Espacio` / `Enter` / `PageDown` |
| Anterior | `←` / `↑` / `Shift + Espacio` / `PageUp` |
| Primera | `Home` |
| Última | `End` |
| Pantalla completa | `F` |
| Miniaturas | `T` |
| Puntero | `P` |
| Pantalla negra | `B` |
| Pantalla blanca | `W` |
| Ajustar a pantalla | `0` |
| Zoom + | `+` |
| Zoom - | `-` |

`Escape` conserva su comportamiento nativo para salir de pantalla completa o cerrar un diálogo.

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica el sitio automáticamente.

1. Crea un repositorio en GitHub y sube este proyecto a la rama `main`.
2. En el repositorio, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions** como fuente.
4. Ejecuta el workflow **Deploy to GitHub Pages** o sube un nuevo commit a `main`.
5. Al terminar, GitHub mostrará la URL publicada en el resumen del workflow.

No hace falta editar `vite.config.js` con el nombre del repositorio: los recursos compilados usan rutas relativas. El archivo `.nojekyll` evita que GitHub Pages procese el resultado con Jekyll.

## Arquitectura

```text
src/
├─ main.js                         # Entrada, File API y drag & drop
├─ pdf/
│  ├─ pdf-loader.js                # Validación, PDF.js y contraseñas
│  ├─ pdf-renderer.js              # Render nítido, cancelación y precarga
│  └─ render-cache.js              # Caché LRU acotada
├─ presentation/
│  ├─ presentation.js              # Estado y coordinación
│  ├─ keyboard.js                  # Atajos
│  ├─ fullscreen.js                # Fullscreen API
│  ├─ gestures.js                  # Swipe táctil
│  ├─ pointer.js                   # Puntero virtual
│  └─ timer.js                     # Temporizador en memoria
├─ ui/
│  ├─ controls.js                  # Barra flotante y auto-ocultado
│  ├─ thumbnails.js                # Miniaturas lazy con caché limitada
│  └─ dialogs.js                   # Contraseña, errores y avisos
└─ styles/
   ├─ tokens.css                   # Variables visuales
   └─ main.css                     # Diseño responsive
```

La página actual se renderiza con una resolución interna proporcional a `devicePixelRatio`, limitada por dimensiones y cantidad de píxeles para evitar texturas enormes. Al navegar se precargan solamente las páginas adyacentes; las tareas que quedan obsoletas se cancelan.

## Comprobación manual recomendada

Prueba al menos un PDF vertical, uno horizontal y un documento largo. Comprueba navegación con teclado, cambio de tamaño, miniaturas, zoom, puntero, pantallas negra/blanca y entrada/salida de fullscreen. Las herramientas de red del navegador no deben mostrar ninguna transferencia del PDF: después de cargar los archivos estáticos, el procesamiento es totalmente local.

## Licencia

MIT. Consulta [LICENSE](./LICENSE).
