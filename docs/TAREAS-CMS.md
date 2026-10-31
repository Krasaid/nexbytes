# Fase 4: CMS de Nexbytes

Panel `/admin` para editar todo el contenido de la landing, gestionar cotizaciones y la lista de espera, subir imágenes a R2 y publicar sin tocar código.

Se le pide a Claude Code igual que antes:

> Lee `CLAUDE.md` y `docs/TAREAS-CMS.md`. Haz la tarea **T16** y nada más. Al terminar: build, pruebas, marcar `[x]` y commit.

Orden: **T14 → T15 → T16** primero (datos, build y despliegue automático). Después **T17 → T18 → T19**, luego **T20 → T21 → T22**, y por último **T23 → T24**.

---

## Arquitectura (léela antes de cualquier tarea)

```
                 ┌──────────── /admin (Vue SPA dentro del mismo proyecto Astro)
                 │                 │ Firebase Auth (solo UID admin)
                 │                 ├─ lee/escribe ─► Firestore  borradores/{bloque}
                 │                 ├─ lee/actualiza ► Firestore cotizaciones, lista_espera
                 │                 ├─ POST /upload ─► Worker Cloudflare ─► R2
                 │                 └─ POST /publish ► Worker Cloudflare ─► GitHub repository_dispatch
                 │
GitHub Actions ──┤ build: content.ts lee Firestore publicado/{bloque} ─► astro build ─► firebase deploy
                 │
Landing ─────────┘ HTML estático (sin cambios para el visitante)
```

**Decisiones:**
- **Borrador y publicado separados.** El admin edita `borradores/{bloque}`. "Publicar" copia todos los borradores a `publicado/{bloque}` y dispara el rebuild. La landing solo se construye desde `publicado`, así que nada a medio editar llega al sitio.
- **Mismos schemas zod.** `src/lib/schemas.ts` valida en tres lugares: los formularios del admin, antes de guardar el borrador y en el build. Si un dato no pasa, no se guarda ni se publica.
- **Bloques = documentos.** `site`, `hero`, `servicios`, `proyectos`, `proceso`, `producto`, `cotizador`, `nosotros`. Cada uno es un documento con la misma forma que su JSON actual.
- **Un Worker de Cloudflare como backend.** Verifica el token de Firebase y el UID admin, sube imágenes a R2 con un binding (sin exponer claves) y llama a la API de GitHub con un token guardado como secreto. No necesita el plan Blaze de Firebase y usa la cuenta de Cloudflare que ya tienes para R2.
- **Los JSON locales siguen existiendo** como semilla y respaldo: `npm run seed` los sube a Firestore. En desarrollo, `CONTENT_SOURCE=local` sigue funcionando sin red.
- **El admin no se indexa:** `noindex`, fuera del sitemap y bloqueado en `robots.txt`.
- **El build lee siempre con firebase-admin** y la cuenta de servicio, tanto para `publicado` como para `borradores`. Eso se salta App Check y las reglas, así que el día que se active la protección de App Check el build sigue funcionando. Por lo mismo, ninguna colección de contenido necesita lectura pública.
- **Rama `main`.** Al crear el remoto en GitHub, renombra la rama local (`git branch -m master main`).
- **Reutilizar el CMS del portafolio**, que está en `C:\Users\Yuli\Desktop\porfoliotop`: `worker/`, `src/pages/admin/`, `src/lib/media.ts`, `scripts/configure-worker.mjs`, `scripts/initialize-cms.mjs` y las pruebas de Playwright del editor. Revísalo antes de escribir algo de cero.

**Reglas del admin (se suman a las de `CLAUDE.md`):**
- **Excepción a la regla #1:** la regla de "nada de contenido en los componentes" aplica a la landing. Los textos de la interfaz del admin ("Guardar", "Sin acceso", etc.) no los edita ningún CMS y van en `src/admin/textos.ts`.
- El admin usa los mismos tokens de diseño, pero prioriza claridad: formularios legibles, estados visibles (guardando, guardado, error, cambios sin publicar).
- Ningún secreto en el cliente: el token de GitHub y las credenciales de R2 viven solo en el Worker y en GitHub Secrets.
- Toda acción destructiva (borrar un proyecto, quitar una imagen) pide confirmación con un diálogo accesible, nunca `confirm()`.

---

## Fase 4a: Datos, build y despliegue

### [x] T14. Firestore para contenido + semilla
- Colecciones nuevas:
  - `borradores/{bloque}`: solo el admin lee y escribe.
  - `publicado/{bloque}`: solo el admin lee y escribe (el build lee con firebase-admin).
  - `publicaciones/{id}`: historial de publicaciones con `estado` (`solicitada` | `construyendo` | `publicada` | `error`), `tipo` (`produccion` | `preview`), `solicitadaEn`, `terminadaEn?`, `url?` y `error?`. El admin lee y crea; GitHub Actions actualiza (con cuenta de servicio).
- Cada documento de contenido lleva `actualizadoEn` (serverTimestamp) y `version` (entero que sube en cada guardado). Las reglas exigen que en cada actualización `version` sea exactamente el valor anterior + 1, y que `actualizadoEn` sea `request.time`.
- **Excepción en `publicado`: copia exacta del borrador.** La regla de `version + 1` aplica a `borradores`. En `publicado`, las reglas exigen que el documento sea idéntico a `borradores/{bloque}` en ese momento (mismo contenido y misma `version`); solo puede cambiar `actualizadoEn`, que va con `request.time`. Así "version del borrador > publicado" indica los cambios sin publicar, y volver a publicar un bloque sin cambios es válido. Consecuencias para **T22**:
  - Publicar **solo lee** los borradores y escribe `publicado`; nunca modifica un borrador en el mismo batch (la regla compara contra el borrador ya guardado, no contra el resultado del batch).
  - Copia cada borrador tal cual, sin quitar ni agregar campos, salvo `actualizadoEn: serverTimestamp()`.
  - Si el borrador cambia entre la lectura y el batch, la regla rechaza la publicación: hay que volver a leer y reintentar.
- Ampliar las reglas existentes de `cotizaciones` y `lista_espera`: el admin también puede editar un campo `notas` (string de hasta 2000 caracteres).
- Script `npm run seed`: valida cada JSON de `src/content/data/` con su schema y lo sube a `borradores` y `publicado`. Usa firebase-admin con una cuenta de servicio (`GOOGLE_APPLICATION_CREDENTIALS`, fuera del repo). Pide confirmación antes de sobrescribir.
- Pruebas de reglas con el emulador para todo lo nuevo.

**Listo cuando:** `npm run seed` llena Firestore, y las pruebas de reglas confirman que el público no puede leer `publicado` ni `borradores` y que una actualización con `version` incorrecta se rechaza.

### [x] T15. El build lee de Firestore
- `src/lib/content.ts`: fuente según la variable `CONTENT_SOURCE`, que acepta tres valores: `local` (los JSON, por defecto en desarrollo), `firestore` (lee `publicado`) y `firestore-borradores` (lee `borradores`, para las vistas previas).
- Las dos fuentes de Firestore leen con firebase-admin y la cuenta de servicio, nunca con el SDK cliente ni con REST pública.
- Con `firestore` o `firestore-borradores`, lee cada `{bloque}` en tiempo de build, valida con zod y **falla el build** con un mensaje claro si falta un bloque o no pasa el schema. Nunca publica contenido vacío.
- Los componentes no cambian.

**Listo cuando:** `CONTENT_SOURCE=firestore npm run build` genera exactamente el mismo HTML que con `local` (compáralo con un diff).

### [ ] T16. Despliegue automático con GitHub Actions
- Requiere el repo en GitHub (privado). Si no tiene remoto, pídeme crearlo.
- `.github/workflows/deploy.yml`, que se dispara con:
  - `repository_dispatch` de tipo `publicar` (payload: `publicacionId`, `tipo`);
  - `workflow_dispatch` manual;
  - `push` a `main`.
- `concurrency: { group: deploy, cancel-in-progress: false }`, para que un push y un "Publicar" nunca desplieguen al mismo tiempo.
- Pasos: checkout → `npm ci` → pruebas → build → deploy.
  - Con `tipo: produccion` o con `push`: `CONTENT_SOURCE=firestore` y despliegue a producción.
  - Con `tipo: preview`: `CONTENT_SOURCE=firestore-borradores` y despliegue a un canal de preview.
- Si viene `publicacionId`, actualiza `publicaciones/{id}` a `construyendo`, y al final a `publicada` (con la URL) o a `error` (con el mensaje).
- Secretos en GitHub: `FIREBASE_SERVICE_ACCOUNT` y las variables `PUBLIC_*` del build. Documentarlos en el README con los pasos exactos para crearlos.

**Listo cuando:** un `workflow_dispatch` manual despliega a un preview y el historial en Firestore se actualiza.

---

## Fase 4b: Panel admin

### [ ] T17. Base del admin y acceso
- Ruta `/admin` con una SPA de Vue (`client:only="vue"`) y su propio layout. Se excluye del sitemap, lleva `noindex` y su CSP permite Firebase Auth.
- Login con el mismo proveedor con el que se creó el UID `kcUUn8dbtDdrv50iXDHkcupN8t73`. Si otra cuenta inicia sesión: mensaje "Sin acceso" y cierre de sesión.
- Router interno (vue-router en modo hash o `history` con fallback en `firebase.json`).
- Layout: barra lateral con **Contenido** (un enlace por bloque), **Bandeja** (Cotizaciones, Lista de espera) y **Publicar**. Arriba: indicador de "cambios sin publicar", usuario y cerrar sesión. En móvil, la barra lateral se vuelve menú.
- La página de inicio del admin resume: cotizaciones nuevas, última publicación y si hay borradores sin publicar (comparando `version` de borradores contra publicado).

### [ ] T18. Componentes de formulario + editores de Sitio y Hero
- Componentes en `src/admin/fields/`:
  - `TextField` y `TextArea`, con contador de caracteres cuando el schema tiene máximo;
  - `UrlField`, `SelectField`, `ToggleField`;
  - `ListField`: lista de strings u objetos con agregar, quitar (con confirmación) y reordenar con botones arriba/abajo, accesible por teclado;
  - `ImageField`: por ahora solo muestra la ruta y la vista previa con `cdn()`; la subida llega en T21.
- Todos con `<label>`, mensaje de error debajo del campo (texto de zod traducido a español) y `aria-invalid`.
- `useBloque(nombre)`: carga el borrador, mantiene el estado sucio, valida con zod, guarda con `version + 1` y avisa si al salir hay cambios sin guardar.
- Editores de **Sitio** (incluye SEO e imagen OG) y **Hero**.

### [ ] T19. Editores del resto de bloques
- **Servicios** (el ícono se elige de los nombres disponibles en `Icon.astro`, con vista previa), **Proyectos** (alta, edición, orden, visible/oculto y slug autogenerado y editable), **Proceso**, **Producto** (con el interruptor `visible` destacado), **Cotizador** (opciones de cada paso y `plantillaWhatsapp` con lista de marcadores disponibles y vista previa del mensaje armado con datos de ejemplo usando `buildQuoteMessage`) y **Nosotros**.
- Vista previa en vivo opcional para Proyectos: renderiza la tarjeta con el mismo `ProyectoCard`, o una versión Vue equivalente si no es posible.

---

## Fase 4c: Imágenes y publicación

### [ ] T20. Worker de Cloudflare (`workers/nexbytes-api`)
- Proyecto con Wrangler, binding al bucket R2 y secretos `GITHUB_TOKEN` (fine-grained, solo permiso para disparar el workflow de este repo), `GITHUB_REPO` y `ADMIN_UID`.
- Middleware: verifica el ID token de Firebase (firma con las llaves públicas de Google, `aud` = project ID, `iss` correcto, no expirado; usa `jose`) y que el `uid` sea `ADMIN_UID`. CORS solo para los dominios del sitio y localhost.
- `POST /upload`: recibe el archivo (multipart). Solo acepta WebP o AVIF de hasta 2 MB y prefijos permitidos (`proyectos/`, `nosotros/`, `seo/`, `general/`).
  - No confía en el `Content-Type` del navegador: revisa los primeros bytes del archivo (WebP: `RIFF…WEBP`; AVIF: caja `ftyp` con marca `avif`/`avis`) y rechaza cualquier otra cosa.
  - Guarda con un nombre único (`<prefijo>/<slug>-<hash corto>.<ext>`), con la extensión del tipo real (`.webp` o `.avif`) y el `Content-Type` correcto en R2. Devuelve `{ path }`.
- `POST /publish`: recibe `{ publicacionId, tipo }` y llama a `repository_dispatch` de GitHub.
- `DELETE /upload`: borra una ruta (solo dentro de los prefijos permitidos).
- Pruebas con el runner de Vitest para Workers. README con `wrangler deploy` y cómo cargar los secretos.

### [ ] T21. Subida de imágenes desde el admin
- `ImageField` completo: elegir o arrastrar archivo → redimensionar en el navegador (lado mayor 1600 px; la imagen OG exactamente 1200×630 con recorte centrado) → convertir a WebP (calidad ~0.82) → subir al Worker con el ID token → guardar la ruta en el campo.
- Muestra progreso, vista previa, peso final y botón para quitar. Al quitar, solo se borra la referencia del campo; borrar en R2 es un botón aparte, con confirmación.
- Campo de texto alternativo (`alt`) obligatorio junto a cada imagen. Agrégalo a los schemas donde haga falta.

### [ ] T22. Botón Publicar
- Página **Publicar**: lista de bloques con cambios (version de borrador > publicado) y dos botones:
  - **Vista previa**: crea `publicaciones/{id}` con `tipo: preview` y llama a `/publish`. El workflow construye desde los borradores (`firestore-borradores`, ya preparado en T15 y T16) y despliega a un canal de preview.
  - **Publicar**: valida todos los borradores con zod, los copia a `publicado` en un batch, crea `publicaciones/{id}` con `tipo: produccion` y llama a `/publish`.
- Estado en vivo (`onSnapshot` de la publicación): solicitada → construyendo → publicada (con enlace) o error (con mensaje).
- Historial de las últimas 10 publicaciones.
- Evita la doble publicación: botón deshabilitado mientras haya una publicación en curso.

---

## Fase 4d: Bandeja y cierre

### [ ] T23. Bandeja de cotizaciones y lista de espera
- **Cotizaciones:** tabla o lista ordenada por fecha, filtro por estado, búsqueda por `ref` o nombre y contador de nuevas en la barra lateral.
- Detalle de cada cotización: todos los campos, cambio de estado (nuevo → contactado → propuesta → ganado/perdido), notas internas y botón **"Escribir por WhatsApp"** con el número del cliente (`wa.me`) y un saludo que incluya el `ref`.
- **Lista de espera:** lista, cambio de estado (nuevo/invitado/baja) y exportar a CSV.
- Paginación con cursores de Firestore (20 por página).

### [ ] T24. Cierre: seguridad, pruebas y documentación
- Revisar las reglas completas con pruebas de emulador para cada colección y rol.
- Prueba de punta a punta: editar un texto → vista previa → publicar → el cambio aparece en producción.
- Accesibilidad del admin: recorrido completo con teclado y foco visible.
- App Check también en las llamadas del admin a Firestore.
- `docs/CMS.md`: cómo editar, cómo publicar, qué hacer si una publicación falla y cómo restaurar el contenido desde los JSON (`npm run seed`).
- Actualizar `CLAUDE.md` con la arquitectura del CMS.

---

## Lo que tienes que hacer tú durante la Fase 4

- **T14:** crear una cuenta de servicio en Firebase (Configuración del proyecto → Cuentas de servicio) y guardar el JSON fuera del repo.
- **T16:** crear el repo privado en GitHub, renombrar la rama a `main` y cargar los secretos que indique el README.
- **T20:** crear en GitHub un token fine-grained solo para este repo, y tener a mano tu cuenta de Cloudflare para `wrangler deploy`.
