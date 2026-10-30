# Tareas — Landing Nexbytes

Cada tarea es independiente y se le da a Claude Code así:

> Lee `CLAUDE.md` y `docs/TAREAS.md`. Haz la tarea **T3** y nada más. Usa `docs/mockup/landing.dc.html` como referencia visual.

Orden: **T0 → T1** primero (base y contenido). Después las secciones **T2–T9** en cualquier orden. Luego **T10 → T11 → T12 → T13**.

---

## Fase 1: Base

### [x] T0. Fundaciones del proyecto
**Objetivo:** dejar la base para que todas las secciones usen lo mismo.
- Configurar Astro en modo estático y confirmar que la integración de Vue funciona.
- Instalar `@fontsource/space-grotesk` (400, 500, 600, 700), `@fontsource/jetbrains-mono` (400, 500), `zod`, `gsap`, `firebase`.
- Crear `src/styles/tokens.css` con las variables del mockup:
  - `--bg: #0A0A0B`, `--bg-alt: #0D0D0E`, `--surface: #121213`, `--surface-2: #0F0F10`
  - `--line: #2B2720`, `--line-strong: #3A352B`
  - `--text: #F3EFE6`, `--text-soft: #D9D3C7`, `--muted: #A8A196`, `--faint: #8F897E`
  - `--gold: #D4AF37`, `--gold-light: #E6C068`, `--gold-tint: rgb(212 175 55 / 0.12)`
  - Radios (8, 10, 14, 16, 20 px), contenedor `--container: 1200px`, padding de sección 96 px (64 px en móvil)
  - `--font-sans: 'Space Grotesk'`, `--font-mono: 'JetBrains Mono'`
- `src/styles/global.css`: reset, `body` con fondo y color, `scroll-behavior: smooth`, foco visible dorado, estilos de `input`/`textarea`, clase `.ph` (placeholder con cuadrícula), utilidad `.container`.
- `src/layouts/Base.astro`: `<html lang="es">`, meta básicos, fuentes, global.css, slot. Recibe `title` y `description` por props.
- Componentes UI en `src/components/ui/`:
  - `Icon.astro`: set de íconos SVG de trazo por nombre (`web`, `android`, `database`, `shield`, `check`, `check-circle`, `arrow-right`, `menu`, `close`), con `aria-hidden` por defecto.
  - `Logo.astro`: el hexágono con la "N" del mockup, con prop `size`. Debe ser fácil de reemplazar por el logo real después.
  - `SectionHeader.astro`: props `eyebrow`, `title`, `description?`, `id?`.
  - `Button.astro`: variantes `primary` (dorado) y `ghost` (borde), renderiza `<a>` si recibe `href`.
  - `Placeholder.astro`: caja `.ph` con etiqueta en mono.
- `src/lib/cdn.ts` con `cdn(path)`.
- `.env.example` con las variables de `CLAUDE.md`.

**Listo cuando:** `npm run build` pasa y una página de prueba muestra fuentes, colores y los componentes UI.

### [x] T1. Capa de contenido (preparada para el CMS)
**Objetivo:** que todo el contenido salga de JSON validado. Este es el contrato que después usará el CMS.
- `src/lib/schemas.ts` con zod:
  - `site`: nombre, tagline, ciudad, correo, whatsapp, enlaces de navegación `{label, href}[]`, CTA del menú, redes sociales opcionales, SEO (título, descripción, imagen OG).
  - `hero`: eyebrow, título, subtítulo, `ctaPrimario {label, href}`, `ctaSecundario`, tarjeta `{marca, subtitulo, codigo, ubicacion}`, chips `{numero, label}[]`.
  - `servicios`: header `{eyebrow, titulo, descripcion}` + items `{icono, titulo, descripcion}[]`.
  - `proyectos`: header + items `{slug, titulo, etiqueta, resumen, stack: string[], imagen?, url?, orden, visible}[]`.
  - `proceso`: header + pasos `{titulo, descripcion}[]`.
  - `producto`: `{visible, eyebrow, nombre, descripcion, beneficios: string[], listaEspera {titulo, texto, label, placeholder, boton, exitoTitulo, exitoTexto}}`.
  - `cotizador`: header, pasos `{nombre}[]`, `tipos {label, hint}[]`, `funciones string[]`, `plazos string[]`, `presupuestos string[]`, textos de botones, mensaje de éxito, textos del resumen.
  - `nosotros`: eyebrow, título, texto, foto?, tecnologías `string[]`, link al portafolio.
- `src/content/data/*.json`: un archivo por bloque con **todo el texto del mockup**. Lo que en el mockup está entre corchetes (`[NOMBRE DEL SAAS]`, `[CORREO]`, `[RANGO 1]`…) se deja igual para llenarlo después.
- `src/lib/content.ts`: funciones `getSite()`, `getHero()`, `getServicios()`, `getProyectos()` (filtra `visible` y ordena por `orden`), `getProceso()`, `getProducto()`, `getCotizador()`, `getNosotros()`. Cada una valida con su schema y lanza un error claro si el JSON está mal.
- Comentario al inicio de `content.ts` que explique que en la fase CMS esta capa leerá de Firestore en build.

**Listo cuando:** si se rompe un JSON a propósito, el build falla con un mensaje que dice qué campo está mal.

---

## Fase 2: Secciones (pasar el mockup a componentes)

Todas viven en `src/components/sections/`, reciben sus datos de `content.ts` desde `pages/index.astro` y usan tokens y componentes UI. Hay que marcar con `data-anim` los elementos que se van a animar en T10.

### [x] T2. Nav y Footer
- `Nav.astro`: logo + nombre, links de ancla, botón "Cotizar proyecto". En móvil (menos de 768 px), botón hamburguesa que abre un panel (isla Vue chica o `<details>` accesible). Fondo con blur al hacer scroll es opcional.
- `Footer.astro`: logo, tagline, columnas de Contacto y Explorar, línea inferior con © año dinámico y `com.nexbytes`. Borde superior dorado.
- Links de WhatsApp como `https://wa.me/<numero>` armados desde `site.whatsapp`.

### [x] T3. Hero
- Dos columnas que se apilan en móvil: texto (eyebrow mono dorado, h1 con `clamp(40px, 5.6vw, 72px)`, subtítulo, 2 botones) y la **tarjeta de presentación** (borde dorado, esquinas marcadas, logo, `NEXBYTES`, subtítulo, `com.nexbytes.*` y ubicación) con los 3 chips debajo.
- La tarjeta es la pieza visual principal: hay que cuidar proporción (`aspect-ratio: 1.75`) y detalles.

### [x] T4. Servicios
- Header + grid `auto-fit, minmax(min(100%, 250px), 1fr)` de tarjetas con ícono (por nombre desde JSON), título y descripción. Fondo `--bg-alt`.

### [x] T5. Proyectos
- Header + grid de 2 columnas (1 en móvil). Cada tarjeta: imagen desde R2 con `cdn()` o `Placeholder`, título, etiqueta tipo píldora, resumen, stack en mono y link "Ver sitio →" si hay `url`.
- Crear `ProyectoCard.astro` aparte, porque el CMS lo va a reutilizar en la vista previa.

### [x] T6. Proceso
- Header + lista ordenada (`<ol>`) de pasos con número en mono, borde superior (el primero dorado) y texto. 5 columnas en escritorio, apiladas en móvil.

### [x] T7. Producto propio + lista de espera (solo UI)
- Bloque con borde dorado: texto, beneficios con check y la tarjeta de lista de espera.
- `islands/ListaEspera.vue` (`client:visible`): input de correo con validación básica, botón y estado de éxito. El envío llama a `submitWaitlist(email)` de `src/lib/forms.ts`, que por ahora es un stub que devuelve una promesa resuelta (se conecta en T11).
- Si `producto.visible` es `false`, la sección no se renderiza.

### [x] T8. Cotizador (solo UI)
- `sections/Cotizar.astro` con header y layout de 2 columnas (formulario + resumen, apiladas en móvil).
- `islands/Cotizador.vue` (`client:visible`) recibe por props todo `cotizador` del JSON:
  - Indicador de 5 pasos (barras + nombres).
  - Paso 1 tipo (selección única, tarjeta con label + hint), paso 2 funciones (multiselección con checkbox visual), paso 3 plazo, paso 4 presupuesto, paso 5 contacto (nombre, negocio opcional, correo, WhatsApp, descripción).
  - Botones Atrás / Siguiente / Enviar; en el primer paso, "Paso 1 de 5".
  - Validación: no avanzar sin elegir en los pasos 1, 3 y 4; en el paso 5, nombre y (correo **o** WhatsApp) obligatorios, correo con formato válido.
  - Resumen lateral que se actualiza en vivo.
  - Estado de envío (botón deshabilitado + texto "Enviando…"), estado de éxito y botón "Cotizar otro proyecto".
  - Opciones con `<button aria-pressed>`; al cambiar de paso, el foco se mueve al título del paso.
  - El envío llama a `submitQuote(data)` de `src/lib/forms.ts` (stub por ahora).
- Exportar el tipo `QuoteRequest` desde `src/lib/forms.ts`.

### [x] T9. Nosotros
- Foto (R2 o placeholder) + eyebrow, título, texto, chips de tecnologías y link al portafolio.

---

## Fase 3: Vida, datos y publicación

### [x] T10. Animaciones con GSAP
- `src/scripts/animations.ts`, cargado una vez en `Base.astro`.
- Entrada del hero: eyebrow → título (por líneas o palabras) → subtítulo → botones, y la tarjeta entra con una línea dorada que se "dibuja" en el borde y las esquinas.
- `data-anim="fade-up"` con ScrollTrigger para encabezados y tarjetas (stagger en grids).
- `data-anim="draw-line"` para bordes superiores del proceso y el borde del footer.
- Hover sutil en tarjetas (borde que pasa a dorado), hecho con CSS.
- Con `prefers-reduced-motion`, nada se anima. Sin JS todo es visible.
- Nada de animaciones que muevan el layout (CLS = 0).

### [x] T11. Conectar formularios a Firestore
- `src/lib/firebase.ts`: init perezoso (solo se carga cuando se usa un formulario), con App Check usando reCAPTCHA.
- `src/lib/forms.ts`: implementar `submitQuote` → colección `cotizaciones` y `submitWaitlist` → colección `lista_espera`, con `estado: 'nuevo'` y `creadoEn: serverTimestamp()`.
- `firestore.rules`: el público solo puede **crear** en esas colecciones, con validación de campos, tipos y longitudes; nadie puede leer, editar ni borrar desde el cliente (el CMS usará un admin autenticado, se define en la fase CMS).
- Campo trampa (honeypot) oculto en ambos formularios.
- Manejo de error visible en la UI ("No pudimos enviar, escríbenos por WhatsApp" con link).
- (No se hizo: sin Cloud Functions; el aviso llega por WhatsApp.) Opcional, requiere el plan Blaze: Cloud Function `onDocumentCreated('cotizaciones/{id}')` que avise por correo o Telegram.

### [x] T12. SEO, rendimiento y accesibilidad
- Meta y Open Graph desde `site.seo`, `@astrojs/sitemap`, `robots.txt`, favicon con el logo, página 404 con el mismo estilo.
- Datos estructurados JSON-LD tipo `Organization` / `ProfessionalService`.
- Lighthouse móvil con 95 o más en Performance, Accessibility, Best Practices y SEO. Corregir lo que falte.
- Revisar navegación con teclado de punta a punta, incluido el cotizador.

### [ ] T13. Configuración de despliegue
- `firebase.json`: `public: dist`, `cleanUrls`, cache largo e inmutable para `/_astro/**` y las fuentes, sin cache para el HTML, headers de seguridad (CSP que permita Firebase, reCAPTCHA y el dominio de R2; `X-Content-Type-Options`; `Referrer-Policy`).
- Script `npm run deploy` (build + deploy) y canal de preview.
- Configurar CORS del bucket R2 y el dominio propio (ej. `cdn.nexbytes.com`), y documentarlo en el README.

---

## Fase 4: CMS (se detalla cuando terminemos la landing)

Se deja anotado para no perder el rumbo:
- Panel `/admin` (o app aparte) con Firebase Auth, acceso solo para tu cuenta (custom claim `admin`).
- Un editor por cada bloque de `schemas.ts` (mismos schemas zod que valida la landing).
- Subida de imágenes a R2 con URLs firmadas (Cloud Function o Worker).
- Bandeja de **cotizaciones** y **lista de espera** con cambio de estado (nuevo → contactado → propuesta → ganado/perdido).
- Botón **Publicar**: guarda el contenido en Firestore y dispara un rebuild (GitHub Action con `firebase deploy`). `content.ts` pasa a leer Firestore en build.
- Reutilizar lo que ya funciona del CMS del portafolio.
