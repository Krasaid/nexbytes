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
- Los datos se leen **únicamente** a través de `src/lib/content.ts` (`getSite()`, `getHero()`, `getServicios()`, etc.), que valida con **zod** (`src/lib/schemas.ts`). Hoy lee los JSON locales; cuando exista el CMS, solo cambia la implementación de `content.ts` (leer de Firestore en build). Los componentes no se tocan.
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
  scripts/
    animations.ts
    anim-flag.js       # script inline que activa los estados iniciales de animación
  pages/               # index.astro, 404.astro, robots.txt.ts
```

## Cómo encajan las piezas

- **Contenido:** `pages/index.astro` llama a todos los `get*()` de `content.ts` y pasa cada bloque como prop a su sección. Las funciones son `async` a propósito (el CMS leerá de Firestore en build). `getProyectos()` ya filtra `visible` y ordena por `orden`. Si un JSON no cumple el schema, el build falla con el archivo y el campo.
- **Placeholders de contacto:** en `site.json`, `correo` y `whatsapp` pueden valer `[CORREO]` / `[WHATSAPP]`. `links.ts` devuelve `undefined` y `seo.ts` omite el dato, así el componente muestra texto sin link. Mantén ese comportamiento al tocar contacto.
- **Formularios:** islas Vue → `forms.ts` → `import('./firebase')` (App Check con reCAPTCHA v3 + Firestore **Lite**). Nunca importes `firebase.ts` de forma estática: la página no debe descargar Firebase al abrirse. Hay campo trampa (honeypot) y un timeout de 10 s. El cotizador guarda en Firestore y luego abre WhatsApp con el mensaje de `buildQuoteMessage()` (plantilla `plantillaWhatsapp` de `cotizador.json`, marcadores `{ref}`, `{tipo}`, `{funciones}`…; las líneas con marcador vacío se omiten). Si no se pudo guardar, muestra el error con un link de WhatsApp sin `{ref}`. En escritorio la pestaña se abre **antes** del `await` (si no, el navegador la bloquea como popup).
- **Límites en tres lugares:** `limites.ts` ↔ `firestore.rules` (mismos valores, a mano) y `schemas.ts` los usa para que el contenido del cotizador no genere opciones que las reglas rechacen. Si cambias un campo de `cotizaciones` o `lista_espera`, toca los tres y `tests/rules`.
- **Animaciones sin ocultar contenido:** `anim-flag.js` (inline al inicio del `<body>`) agrega la clase `anim` a `<html>` solo si hay JS y no hay movimiento reducido; `global.css` oculta estados iniciales **solo** bajo `.anim`; `animations.ts` marca `data-anim-ready` y, si no corre en 1.5 s, el flag quita la clase. El hero (`data-anim-scope="hero"`) usa una línea de tiempo de entrada, no ScrollTrigger, y su título/subtítulo nunca pasan por `opacity: 0` (son el LCP).
- **CSP:** Astro la genera en un `<meta>` con hashes (`security.csp` en `astro.config.mjs`). Un script `is:inline` nuevo necesita su hash con `Astro.csp.insertScriptHash()` (ver `Base.astro`); un origen externo nuevo va en las directivas de `astro.config.mjs`. `frame-ancestors` y demás headers viven en `firebase.json`. El origen de `PUBLIC_CDN_URL` entra solo a `img-src`/`media-src`.
- **URL del sitio:** `site` en `astro.config.mjs` define canonical, Open Graph, sitemap y `robots.txt`.

## Comandos

- `npm run dev`: servidor local (http://localhost:4321). Para dejarlo corriendo en segundo plano: `npx astro dev --background` (y `astro dev stop|status|logs`)
- `npm run build`: build estático en `dist/`
- `npm run preview`: sirve `dist/` con la CSP real; úsalo para revisar errores de CSP en la consola
- `npx astro check`: chequeo de tipos de `.astro`/`.ts` (no hay linter configurado)
- `npm test`: pruebas unitarias (Vitest, `tests/unit`). Una sola: `npx vitest run tests/unit/whatsapp.test.ts -t "nombre del test"`
- `npm run test:rules`: pruebas de `firestore.rules` con el emulador (`tests/rules`, proyecto `demo-nexbytes`, necesita Java 21+). `scripts/test-rules.mjs` cierra el proceso java que el emulador deja vivo en Windows
- `npm run emulators`: emulador de Firestore para probar los formularios en local (con `PUBLIC_FIRESTORE_EMULATOR` en `.env`)
- `npm run deploy`: pruebas + build + publicar (`firebase deploy --only hosting`)
- `npm run deploy:preview`: pruebas + build + canal de vista previa `preview` (vence en 7 días)
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
# Opcional, solo desarrollo: PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080
```
