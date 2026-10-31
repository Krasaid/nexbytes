# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Nexbytes — Landing web

Sitio de Nexbytes, estudio de software de Fernando Martínez (Santa Ana, El Salvador).
Landing con servicios, proyectos, proceso, producto propio (SaaS), cotizador y contacto.

## Stack

- **Astro** con salida estática (`output: 'static'`), desplegado en **Firebase Hosting** (`dist/`).
- **Vue 3** solo para islas interactivas (`Cotizador.vue`, `ListaEspera.vue`, menú móvil si hace falta).
- **GSAP + ScrollTrigger** para animaciones.
- **Cloudflare R2** para imágenes y videos (servidos desde `PUBLIC_CDN_URL`, bucket público `https://pub-edd98a0eb06b4eef88500ddfde1929eb.r2.dev`).
- **Firestore** para guardar cotizaciones y lista de espera.

## Cómo se trabaja

- Las tareas están en `docs/TAREAS.md` (landing, T0–T13, ya hechas) y `docs/TAREAS-CMS.md` (CMS, T14–T24; lee su sección de arquitectura antes de cualquiera). Haz **una tarea por sesión**, solo la que se pidió.
- Al terminar: corre `npm test` y `npm run build`, revisa que no haya errores y marca la tarea como `[x]` en el archivo de tareas que corresponda.
- La referencia visual es `docs/mockup/landing.dc.html` (copia del mockup). De ahí salen textos, colores, tamaños y estructura. No es código para copiar tal cual: tiene sintaxis de plantilla (`{{accent}}`, `<sc-if>`, `<sc-for>`) que hay que traducir a Astro/Vue.

## Regla #1: nada de contenido escrito a mano en los componentes

Más adelante habrá un **CMS propio** que editará todo el contenido. Por eso:

- Todo texto visible, link, imagen, lista de servicios/proyectos/opciones del cotizador vive en `src/content/data/*.json`.
- Los componentes **solo reciben datos por props** y los pintan. No hay copy en los `.astro` ni en los `.vue`, salvo textos de accesibilidad genéricos (por ejemplo `aria-label="Abrir menú"`).
- Los datos se leen **únicamente** a través de `src/lib/content.ts` (`getSite()`, `getHero()`, `getServicios()`, etc.), que valida con **zod** (`src/lib/schemas.ts`). La fuente la elige `CONTENT_SOURCE` (JSON locales o Firestore en build); los componentes no se enteran.
- Si una tarea necesita un dato nuevo: agrégalo al schema, al JSON y a `content.ts`, en ese orden.

**Excepción: el admin.** Esta regla aplica a la landing. Los textos de la interfaz del panel `/admin` ("Guardar", "Sin acceso", mensajes de error, etc.) no los edita el CMS y van centralizados en `src/admin/textos.ts`, no repartidos por los componentes.

## Regla #2: diseño solo con tokens

- Colores, tipografías, radios y espacios están en `src/styles/tokens.css` como variables CSS. Nunca escribas un hex en un componente.
- Paleta: fondo negro, superficies casi negras, líneas con tinte dorado, acento dorado `#D4AF37`.
- Tipografías: **Space Grotesk** (texto y títulos) y **JetBrains Mono** (etiquetas técnicas), autoalojadas con `@fontsource`.

## Regla #3: medios desde R2

- En los JSON las imágenes se guardan como ruta relativa (`proyectos/wp-producciones.webp`).
- Para construir la URL usa siempre `cdn(path)` de `src/lib/cdn.ts`, que antepone `import.meta.env.PUBLIC_CDN_URL`.
- Si la imagen no existe todavía, muestra el placeholder con cuadrícula del mockup (clase `.ph`).
- Siempre `width`, `height`, `alt`, `loading="lazy"` (excepto el hero) y formatos WebP/AVIF.

## Regla #4: animaciones

- Un solo módulo: `src/scripts/animations.ts`. Los elementos se marcan con atributos (`data-anim="fade-up"`, `data-anim="draw-line"`, `data-anim-delay="0.1"`), no con lógica dentro de cada componente.
- Respeta `prefers-reduced-motion`: si está activo, no animes y deja todo visible.
- El contenido debe verse completo **sin JavaScript** (las animaciones solo agregan, nunca ocultan por defecto en el HTML).

## Regla #5: accesibilidad

- Elementos reales: `<button>`, `<a href>`, `<label>` + `<input>`. Nunca `onClick` en un `div`.
- Contraste mínimo 4.5:1, objetivos táctiles de 44 px o más, foco visible dorado.
- SVG decorativos con `aria-hidden="true"`; los botones que solo tienen ícono llevan `aria-label`.
- Debe funcionar bien a 390 px de ancho.

## Estructura

```
src/
  content/data/        # JSON con todo el contenido (lo que editará el CMS)
  lib/
    schemas.ts         # schemas zod de cada bloque de contenido
    content.ts         # única puerta de acceso al contenido
    cdn.ts             # cdn(path) → URL de R2
    firebase.ts        # init de Firebase (cliente); solo se carga con import()
    forms.ts           # submitQuote / submitWaitlist → Firestore
    limites.ts         # largos máximos (espejo de firestore.rules)
    bloques.ts         # registro bloque → schema (lo usan la semilla, el build y el CMS)
    iconos.ts          # trazos SVG de los íconos (Icon.astro y el selector del admin)
    whatsapp.ts        # mensaje y link de WhatsApp, ref de cotización (funciones puras)
    links.ts, seo.ts   # links de contacto y JSON-LD a partir de site.json
  styles/
    tokens.css
    global.css
  layouts/Base.astro
  components/
    ui/                # Icon, Logo, Button, SectionHeader, Placeholder
    sections/          # una por bloque de la landing (Nav, Hero, …, Footer)
    islands/           # Cotizador.vue, ListaEspera.vue
  admin/               # SPA del panel /admin (Vue + vue-router): textos.ts, acceso.ts, sesion.ts, cambios.ts, vistas/
  scripts/
    animations.ts
    anim-flag.js       # script inline que activa los estados iniciales de animación
  pages/               # index.astro, 404.astro, robots.txt.ts, admin/index.astro
```

## Cómo encajan las piezas

- **Contenido:** `pages/index.astro` llama a todos los `get*()` de `content.ts` y pasa cada bloque como prop a su sección. `getProyectos()` ya filtra `visible` y ordena por `orden`. La lista de bloques y sus schemas está **solo** en `src/lib/bloques.ts`.
- **Fuente del contenido (`CONTENT_SOURCE`):** `local` (JSON, por defecto), `firestore` (`publicado/{bloque}`, producción) o `firestore-borradores` (`borradores/{bloque}`, vistas previas). Las dos de Firestore las lee `content-firestore.ts` con firebase-admin y la cuenta de servicio, cargado con `import()` para que el build local no lo toque. Si un bloque falta o no cumple el schema, el build falla con el archivo o documento y el campo. Para probar sin el proyecto real: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` + `npm run seed -- --yes` dentro de `firebase emulators:exec --project demo-nexbytes`.
- **Placeholders de contacto:** en `site.json`, `correo` y `whatsapp` pueden valer `[CORREO]` / `[WHATSAPP]`. `links.ts` devuelve `undefined` y `seo.ts` omite el dato, así el componente muestra texto sin link. Mantén ese comportamiento al tocar contacto.
- **Formularios:** islas Vue → `forms.ts` → `import('./firebase')` (App Check con reCAPTCHA v3 + Firestore **Lite**). Nunca importes `firebase.ts` de forma estática: la página no debe descargar Firebase al abrirse. Hay campo trampa (honeypot) y un timeout de 10 s. El cotizador guarda en Firestore y luego abre WhatsApp con el mensaje de `buildQuoteMessage()` (plantilla `plantillaWhatsapp` de `cotizador.json`, marcadores `{ref}`, `{tipo}`, `{funciones}`…; las líneas con marcador vacío se omiten). Si no se pudo guardar, muestra el error con un link de WhatsApp sin `{ref}`. En escritorio la pestaña se abre **antes** del `await` (si no, el navegador la bloquea como popup).
- **Límites en tres lugares:** `limites.ts` ↔ `firestore.rules` (mismos valores, a mano) y `schemas.ts` los usa para que el contenido del cotizador no genere opciones que las reglas rechacen. Si cambias un campo de `cotizaciones` o `lista_espera`, toca los tres y `tests/rules`.
- **Animaciones sin ocultar contenido:** `anim-flag.js` (inline al inicio del `<body>`) agrega la clase `anim` a `<html>` solo si hay JS y no hay movimiento reducido; `global.css` oculta estados iniciales **solo** bajo `.anim`; `animations.ts` marca `data-anim-ready` y, si no corre en 1.5 s, el flag quita la clase. El hero (`data-anim-scope="hero"`) usa una línea de tiempo de entrada, no ScrollTrigger, y su título/subtítulo nunca pasan por `opacity: 0` (son el LCP).
- **CSP:** Astro la genera en un `<meta>` con hashes (`security.csp` en `astro.config.mjs`). Un script `is:inline` nuevo necesita su hash con `Astro.csp.insertScriptHash()` (ver `Base.astro`); un origen externo nuevo va en las directivas de `astro.config.mjs`. `frame-ancestors` y demás headers viven en `firebase.json`. El origen de `PUBLIC_CDN_URL` entra solo a `img-src`/`media-src`.
- **Despliegue automático:** `.github/workflows/deploy.yml` (push a `main`, `repository_dispatch` `publicar` o manual). `tipo: produccion` → `CONTENT_SOURCE=firestore` + `firebase deploy`; `tipo: preview` → `firestore-borradores` + canal `preview`. Con `publicacionId`, `scripts/publicacion.mjs` (sin dependencias, REST de Firestore) mueve `publicaciones/{id}` a `construyendo` → `publicada`/`error`. Los valores del payload solo entran a los scripts como variables de entorno, nunca con `${{ }}` dentro de `run:`. Secretos y variables: README.
- **Panel `/admin`:** `pages/admin/index.astro` + `layouts/Admin.astro` montan la SPA con un `<script>` (`src/admin/main.ts`), no con `client:only`: instalar vue-router con `appEntrypoint` lo metería en las islas de la landing. Router en modo hash (`/admin#/contenido/hero`), sin rewrites. Login con correo y contraseña, persistencia de sesión por pestaña; `ADMIN_UID` en `src/admin/acceso.ts` es el mismo de `isAdmin()` en `firestore.rules` (una prueba unitaria lo compara). Otra cuenta ve "Sin acceso" y se le cierra la sesión. Usa la app de `src/lib/firebase.ts` (`getFirebaseApp()`, con App Check) con Auth y Firestore completo (`onSnapshot`). Su CSP se amplía solo en esa página con `Astro.csp.insertDirective` (Auth); la de la landing no cambia. Fuera del sitemap, `Disallow` en robots y `X-Robots-Tag` en `firebase.json`.
- **Editores del admin:** cada campo de `src/admin/fields/` recibe solo su `ruta` en el bloque (`nav.0.label`) y usa `useCampo()` (`formulario.ts`): valor, error visible y límites (opcional, mín./máx. → contador) salen del schema por esa ruta (`campos.ts`). `useBloque()` (`bloque.ts`) carga `borradores/{bloque}`, valida en vivo, guarda la salida de zod con `version + 1` y detecta el conflicto si otra pestaña guardó antes; `hayCambiosSinGuardar` hace que el router, el cierre de sesión y el navegador pidan confirmación. Las confirmaciones usan `confirmar()` (un `<dialog>` nativo en el Shell), nunca `confirm()`. Un editor nuevo = `EditorBloque` + `Seccion` + campos, registrado en `src/admin/vistas/Contenido.vue`. `EditorBloque` acepta `ajustes` (`alCargar`/`alGuardar`): Proyectos ordena por `orden` al cargar y lo renumera por posición al guardar. `TextField`/`TextArea` aceptan `recomendado` (el contador avisa, solo el máximo del schema bloquea; SEO en `LARGOS_SEO` de `schemas.ts`). Los marcadores de la plantilla de WhatsApp salen de `MARCADORES` en `whatsapp.ts` (el schema rechaza los desconocidos).
- **Imágenes en el admin:** `ImageField` (prefijo según el campo: `seo` con `modo="og"`, `proyectos`, `nosotros`) procesa en el navegador con `src/admin/imagen.ts`: `createImageBitmap(..., { imageOrientation: 'from-image' })`, lado mayor 1600 sin agrandar (OG: 1200×630 con recorte centrado), WebP 0.82 con reintentos bajo 2 MB. **El canvas borra el EXIF (incluido el GPS) a propósito.** Sube con `XMLHttpRequest` (`src/admin/api.ts`, progreso real) a `PUBLIC_API_URL`. "Borrar del almacenamiento" solo procede si la ruta no aparece en otro bloque del borrador ni en lo publicado. `alt` es obligatorio en `imagenSchema`. La CSP de `/admin` toma `PUBLIC_API_URL` (connect-src) y `PUBLIC_CDN_URL` + `blob:` (img-src) de las variables de entorno.
- **Publicar (`src/admin/publicacion.ts`, `vistas/Publicar.vue`):** valida los 8 borradores con zod; "Publicar" copia a `publicado` solo los bloques con cambios y crea `publicaciones/{id}` en el mismo batch (si un borrador cambió entretanto, las reglas lo rechazan y se reintenta); "Vista previa" solo registra la solicitud. Luego llama a `/publish`; si falla (503 mientras Actions está pausado), el admin marca la publicación como `error` (única transición que le permiten las reglas) y muestra cómo publicar a mano. Una publicación `solicitada`/`construyendo` de más de 30 min se ve como "sin respuesta" y no bloquea los botones.
- **Bandeja (`vistas/Cotizaciones.vue`, `Cotizacion.vue`, `ListaEspera.vue`):** filtros y búsqueda en la URL (`?estado=…&q=…`), paginación con cursores de 20 (`paginacion.ts`). La búsqueda es por `ref` exacto o por cómo empieza el nombre con mayúscula inicial (Firestore no busca texto contenido ni ignora tildes). Los filtros por estado necesitan los índices compuestos de `firestore.indexes.json` (`firebase deploy --only firestore:indexes`; `deploy:rules` no los despliega). Contador de nuevas en vivo (`nuevas.ts`). Las reglas solo dejan al admin cambiar `estado` y `notas`. CSV de la lista de espera con BOM UTF-8 y celdas protegidas contra fórmulas.
- **Worker `workers/nexbytes-api`:** `POST/DELETE /upload` (R2, binding `BUCKET`) y `POST /publish` (GitHub `repository_dispatch`); todo exige el ID token de la cuenta admin (`src/auth.ts`, `jose`). El tipo de imagen se decide por los primeros bytes (`src/imagenes.ts`), nunca por el `Content-Type`. `createHandler({ llaves, fetch })` recibe las dependencias para las pruebas. Sin `GITHUB_TOKEN`, `/publish` responde 503. Está excluido del `tsconfig` de la raíz.
- **URL del sitio:** `site` en `astro.config.mjs` define canonical, Open Graph, sitemap y `robots.txt`.

## Comandos

- `npm run dev`: servidor local (http://localhost:4321). Para dejarlo corriendo en segundo plano: `npx astro dev --background` (y `astro dev stop|status|logs`)
- `npm run build`: build estático en `dist/` (con los JSON). `CONTENT_SOURCE=firestore npm run build` construye desde Firestore
- `npm run preview`: sirve `dist/` con la CSP real; úsalo para revisar errores de CSP en la consola
- `npx astro check`: chequeo de tipos de `.astro`/`.ts` (no hay linter configurado)
- `npm test`: pruebas unitarias (Vitest, `tests/unit`; las de componentes del admin usan happy-dom y `vitest.config.ts` compila los `.vue`). Una sola: `npx vitest run tests/unit/whatsapp.test.ts -t "nombre del test"`
- `npm run test:rules`: pruebas de `firestore.rules` con el emulador (`tests/rules`, proyecto `demo-nexbytes`, necesita Java 21+). `scripts/test-rules.mjs` cierra el proceso java que el emulador deja vivo en Windows
- `npm run test:e2e`: pruebas del admin en el navegador (Playwright, `tests/e2e`) contra los emuladores de Auth y Firestore, con proyecto `demo-nexbytes`. Filtrar: `npm run test:e2e -- -g palabra` (una palabra o regex sin espacios) o por archivo: `npm run test:e2e -- bloques`
- `npm run seed`: valida los JSON y los sube a `borradores` y `publicado` (firebase-admin, `GOOGLE_APPLICATION_CREDENTIALS`). `--dry-run` muestra lo que haría; `--yes` no pregunta; con `FIRESTORE_EMULATOR_HOST` escribe en el emulador
- `node scripts/publicacion.mjs solicitar preview` crea una solicitud de prueba en `publicaciones/` (imprime el id); `ver <id>` muestra cómo quedó. Para probar el workflow: `gh workflow run deploy.yml -f tipo=preview -f publicacionId=<id>`
- `workers/nexbytes-api` (Worker de la API del admin, proyecto npm aparte con Vitest 4): `npm test` (runner de Vitest para Workers, R2 simulado), `npm run dev` (con `.dev.vars`), despliegue y secretos en el README. `node scripts/configure-worker.mjs <url>` guarda `PUBLIC_API_URL` en `.env`
- `npm run emulators`: emulador de Firestore para probar los formularios en local (con `PUBLIC_FIRESTORE_EMULATOR` en `.env`)
- `npm run deploy`: pruebas + build + publicar (`firebase deploy --only hosting`)
- `npm run deploy:preview`: pruebas + build + canal de vista previa `preview` (vence en 7 días)
- `npm run deploy:cms` / `npm run deploy:cms:preview`: publicar a mano desde Firestore (`publicado` → producción, `borradores` → canal `preview`) mientras Actions está pausado. `npm run deploy` usa los JSON locales
- `npm run deploy:rules`: publicar las reglas de Firestore
- En Windows el emulador de Hosting no aplica los `headers` de `firebase.json`; revísalos en el canal de preview con `curl -I <url>`

## Variables de entorno (`.env`, nunca se sube)

```
PUBLIC_CDN_URL=https://pub-edd98a0eb06b4eef88500ddfde1929eb.r2.dev
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_APP_ID=
PUBLIC_RECAPTCHA_SITE_KEY=
# Opcional, solo desarrollo: PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080 y PUBLIC_AUTH_EMULATOR=127.0.0.1:9099
# Solo para npm run seed y el build desde Firestore (ruta fuera del repo): GOOGLE_APPLICATION_CREDENTIALS=
# Solo build: CONTENT_SOURCE=local | firestore | firestore-borradores (por defecto local)
```
