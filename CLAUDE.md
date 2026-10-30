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

- Las tareas están en `docs/TAREAS.md`. Haz **una tarea por sesión**, solo la que se pidió.
- Al terminar: corre `npm run build`, revisa que no haya errores y marca la tarea como `[x]` en `docs/TAREAS.md`.
- La referencia visual es `docs/mockup/landing.dc.html` (copia del mockup). De ahí salen textos, colores, tamaños y estructura. No es código para copiar tal cual: tiene sintaxis de plantilla (`{{accent}}`, `<sc-if>`, `<sc-for>`) que hay que traducir a Astro/Vue.

## Regla #1: nada de contenido escrito a mano en los componentes

Más adelante habrá un **CMS propio** que editará todo el contenido. Por eso:

- Todo texto visible, link, imagen, lista de servicios/proyectos/opciones del cotizador vive en `src/content/data/*.json`.
- Los componentes **solo reciben datos por props** y los pintan. No hay copy en los `.astro` ni en los `.vue`, salvo textos de accesibilidad genéricos (por ejemplo `aria-label="Abrir menú"`).
- Los datos se leen **únicamente** a través de `src/lib/content.ts` (`getSite()`, `getHero()`, `getServicios()`, etc.), que valida con **zod** (`src/lib/schemas.ts`). Hoy lee los JSON locales; cuando exista el CMS, solo cambia la implementación de `content.ts` (leer de Firestore en build). Los componentes no se tocan.
- Si una tarea necesita un dato nuevo: agrégalo al schema, al JSON y a `content.ts`, en ese orden.

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
    firebase.ts        # init de Firebase (cliente)
  styles/
    tokens.css
    global.css
  layouts/Base.astro
  components/
    ui/                # Icon.astro, Button.astro, SectionHeader.astro, Placeholder.astro
    sections/          # Nav, Hero, Servicios, Proyectos, Proceso, Producto, Cotizar, Nosotros, Footer
    islands/           # Cotizador.vue, ListaEspera.vue
  scripts/animations.ts
  pages/index.astro
```

## Comandos

- `npm run dev`: servidor local
- `npm run build`: build estático en `dist/`
- `npm test`: pruebas unitarias (Vitest, `tests/unit`)
- `npm run test:rules`: pruebas de `firestore.rules` con el emulador (`tests/rules`, necesita Java)
- `npm run emulators`: emulador de Firestore para probar los formularios en local (con `PUBLIC_FIRESTORE_EMULATOR` en `.env`)
- `npm run deploy`: pruebas + build + publicar (`firebase deploy --only hosting`)
- `npm run deploy:preview`: pruebas + build + canal de vista previa `preview`
- `npm run deploy:rules`: publicar las reglas de Firestore
- La CSP la genera Astro (`security.csp` en `astro.config.mjs`); un script `is:inline` nuevo necesita su hash con `Astro.csp.insertScriptHash()` (ver `Base.astro`)

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
