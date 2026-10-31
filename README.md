# Nexbytes: landing web

Sitio de Nexbytes, hecho con Astro (estático) + islas Vue + GSAP. Se publica en Firebase Hosting, las imágenes salen de Cloudflare R2 y los formularios se guardan en Firestore.

Las reglas de trabajo (contenido en JSON, tokens de diseño, accesibilidad) están en [`CLAUDE.md`](CLAUDE.md), y las tareas en [`docs/TAREAS.md`](docs/TAREAS.md).

## Puesta en marcha

```sh
npm install
cp .env.example .env   # y llena los valores
npm run dev            # http://localhost:4321
```

Variables de `.env` (ver `.env.example`):

| Variable | Para qué |
| --- | --- |
| `PUBLIC_CDN_URL` | Origen de las imágenes en R2. La CSP lo permite automáticamente. |
| `PUBLIC_FIREBASE_*` | Configuración web de Firebase (proyecto `nexbytes`). |
| `PUBLIC_RECAPTCHA_SITE_KEY` | Clave de sitio de reCAPTCHA v3 para App Check. |
| `PUBLIC_FIRESTORE_EMULATOR` | Opcional, solo en desarrollo: `127.0.0.1:8080` para usar el emulador. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Para `npm run seed` y el build desde Firestore: ruta al JSON de la cuenta de servicio. Guárdalo **fuera del repo**. |
| `CONTENT_SOURCE` | De dónde sale el contenido del build: `local` (JSON de `src/content/data/`, por defecto), `firestore` (lo publicado) o `firestore-borradores` (vistas previas). |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local |
| `npm run build` | Build estático en `dist/` |
| `npm run preview` | Sirve `dist/` en local (con la CSP real) |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:rules` | Pruebas de `firestore.rules` contra el emulador (necesita Java 21+) |
| `npm run seed` | Valida los JSON de `src/content/data/` y los sube a Firestore (`borradores` y `publicado`). Pide confirmación antes de sobrescribir; `npm run seed -- --dry-run` solo muestra lo que haría |
| `npm run test:e2e` | Pruebas del panel `/admin` en el navegador (Playwright) contra los emuladores de Auth y Firestore. Nunca toca el proyecto real |
| `npm run emulators` | Emulador de Firestore para probar formularios en local |
| `npm run deploy:preview` | Pruebas + build + canal de vista previa `preview` (vence en 7 días) |
| `npm run deploy` | Pruebas + build + publicar en producción |
| `npm run deploy:cms` | Pruebas + build **desde Firestore** (`publicado`) + publicar en producción. Es el "Publicar" manual mientras GitHub Actions no corre |
| `npm run deploy:cms:preview` | Igual, pero desde `borradores` y al canal `preview` (vence en 7 días) |
| `npm run deploy:rules` | Publicar `firestore.rules` |

## Panel de administración (`/admin`)

Se entra con la cuenta de correo y contraseña de administración (la del UID de `firestore.rules`). Cualquier otra cuenta ve "Sin acceso" y se le cierra la sesión. La sesión dura mientras la pestaña esté abierta.

Para probarlo en local sin tocar el proyecto real, `npm run test:e2e` levanta los emuladores, crea las cuentas de prueba y recorre el panel (login, sin acceso, recarga, menú móvil y teclado).

## Despliegue

- **Hosting** (`firebase.json`): sitio `nexbytes1`, carpeta `dist/`.
  - URLs limpias: `/404` en vez de `/404.html`, sin barra final.
  - Caché: el HTML no se guarda (`no-cache`, siempre se revalida). `/_astro/**` (JS, CSS y fuentes con hash en el nombre) se guarda un año como `immutable`. Íconos e imágenes de `public/`, un día.
  - Headers de seguridad: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` y `frame-ancestors 'none'`.
- **Reglas de Firestore**: se publican aparte con `npm run deploy:rules`. El público solo puede crear en `cotizaciones` y `lista_espera`; ahí el admin solo puede leer y cambiar `estado` y `notas`. El contenido del CMS (`borradores`, `publicado`) y `publicaciones` son solo del admin.
- **App Check (reCAPTCHA v3)**: no actives el *enforcement* de Firestore hasta ver en la consola (App Check → Firestore) que las solicitudes llegan verificadas. Para desarrollo local, registra el token de depuración que imprime la consola del navegador con `npm run dev` (App Check → Apps → Administrar tokens de depuración).

### Publicar contenido a mano (mientras GitHub Actions está pausado)

GitHub Actions no arranca por un bloqueo de facturación de la cuenta, así que el workflow está desactivado. Hasta que el botón Publicar del admin (T22) funcione, se publica desde la terminal, con la cuenta de servicio de `GOOGLE_APPLICATION_CREDENTIALS` en `.env`:

```powershell
npm run deploy:cms:preview   # vista previa con los borradores (canal "preview", 7 días); la URL sale al final
npm run deploy:cms           # producción con lo publicado
```

Ojo: `npm run deploy` (sin `:cms`) construye con los JSON locales, no con Firestore. El contenido que se haya editado en el CMS se pisa en producción con lo que tengan los JSON.

Cuando se resuelva la facturación: `gh workflow enable deploy.yml` y la prueba de abajo.

### Despliegue automático (GitHub Actions)

`.github/workflows/deploy.yml` construye y despliega en GitHub, leyendo el contenido de Firestore:

| Disparador | Contenido | Destino |
| --- | --- | --- |
| `push` a `main` (salvo si solo cambia documentación: `*.md`, `docs/`) | `publicado` | Producción |
| `repository_dispatch` `publicar` con `tipo: produccion` (botón **Publicar** del admin) | `publicado` | Producción |
| `repository_dispatch` `publicar` con `tipo: preview` (botón **Vista previa**) | `borradores` | Canal `preview` (vence en 7 días) |
| `workflow_dispatch` manual (`gh workflow run`) | según `tipo` | según `tipo` |

Si llega un `publicacionId`, el workflow actualiza `publicaciones/{id}`: `construyendo` → `publicada` (con la URL) o `error` (con un mensaje corto y el enlace a la ejecución). Nunca corren dos despliegues a la vez: el segundo espera.

#### Secreto: `FIREBASE_SERVICE_ACCOUNT`

El JSON de la cuenta de servicio (el mismo de `npm run seed`). El workflow lo escribe en un archivo temporal del runner, lo usa como `GOOGLE_APPLICATION_CREDENTIALS` y lo borra al terminar, aunque el job falle. Desde PowerShell, en la carpeta del proyecto:

```powershell
Get-Content C:\Users\Yuli\.secrets\nexbytes-sa.json -Raw | gh secret set FIREBASE_SERVICE_ACCOUNT
```

La cuenta necesita leer y escribir Firestore y desplegar en Hosting. Si el paso **Desplegar** falla con un error de permisos (403), dale en [IAM](https://console.cloud.google.com/iam-admin/iam?project=nexbytes) los roles **Administrador de Firebase Hosting** y **Visualizador de claves de API**.

#### Variables: `PUBLIC_*`

Son las mismas de `.env` y no son secretas (terminan dentro del JavaScript del sitio), así que van como **variables** del repositorio, no como secretos:

| Variable | De dónde sale |
| --- | --- |
| `PUBLIC_CDN_URL` | Cloudflare → R2 → bucket → Settings → *Public Development URL* (o el dominio propio del bucket). |
| `PUBLIC_FIREBASE_API_KEY` | Consola de Firebase → Configuración del proyecto → General → *Tus apps* → app web → `apiKey`. |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Mismo lugar → `authDomain`. |
| `PUBLIC_FIREBASE_PROJECT_ID` | Mismo lugar → `projectId` (`nexbytes`). |
| `PUBLIC_FIREBASE_APP_ID` | Mismo lugar → `appId`. |
| `PUBLIC_RECAPTCHA_SITE_KEY` | Consola de Firebase → App Check → Apps → app web → reCAPTCHA v3 (o [admin de reCAPTCHA](https://www.google.com/recaptcha/admin)) → clave de sitio. |

Una por una, desde PowerShell:

```powershell
gh variable set PUBLIC_CDN_URL --body "https://pub-edd98a0eb06b4eef88500ddfde1929eb.r2.dev"
gh variable set PUBLIC_FIREBASE_API_KEY --body "<apiKey>"
# … igual con las demás
```

O todas a la vez desde tu `.env` (toma solo las `PUBLIC_*` con valor y omite la del emulador):

```powershell
Get-Content .env | Where-Object { $_ -match '^PUBLIC_[A-Z_]+=.+' -and $_ -notmatch '^PUBLIC_FIRESTORE_EMULATOR' } | ForEach-Object { $k, $v = $_ -split '=', 2; gh variable set $k --body $v }
gh variable list
```

#### Probar un despliegue a preview

```powershell
# 1. Crear una solicitud de prueba en publicaciones/ (imprime su id)
$id = node scripts/publicacion.mjs solicitar preview
# 2. Lanzar el workflow con ese id y seguirlo
gh workflow run deploy.yml -f tipo=preview -f publicacionId=$id
gh run watch
# 3. Ver cómo quedó el historial (estado, url, terminadaEn)
node scripts/publicacion.mjs ver $id
```

Sin `publicacionId` también despliega, pero no toca el historial. Si algo falla, `gh run view --log-failed` muestra el paso que falló.

### CSP

La política principal la genera Astro (`security.csp` en `astro.config.mjs`). Va en un `<meta>` de cada página, con los hashes exactos de los scripts y estilos inline de ese build, así que no hace falta `'unsafe-inline'`. Permite:

- `connect-src`: Firestore (`firestore.googleapis.com`) y App Check (`content-firebaseappcheck.googleapis.com`).
- `script-src` y `frame-src`: reCAPTCHA (`www.google.com/recaptcha`, `www.gstatic.com/recaptcha`).
- `img-src` y `media-src`: el origen de `PUBLIC_CDN_URL` (R2).

Un `<meta>` no puede declarar `frame-ancestors`: ese va como header en `firebase.json`.

Si agregas un script `is:inline`, su hash no se calcula solo. Agrégalo con `Astro.csp.insertScriptHash()`, como en `src/layouts/Base.astro`. Para probar la CSP, usa `npm run build && npm run preview` y revisa la consola del navegador.

> En Windows, el emulador de Hosting (`firebase emulators:start --only hosting`) **no aplica** los `headers` de `firebase.json`: arma los patrones con `\` en lugar de `/`. Los headers se revisan en el canal de preview: `curl -I <url>`.

## API del admin (Cloudflare Worker)

`workers/nexbytes-api` es el backend del admin. Verifica el ID token de Firebase de la cuenta admin (firma de Google, `aud`/`iss` del proyecto `nexbytes`, sin vencer, UID de `ADMIN_UID`) y luego:

| Ruta | Qué hace |
| --- | --- |
| `POST /upload` | Multipart con `archivo`, `prefijo` (`proyectos`, `nosotros`, `seo` o `general`) y `slug` opcional. Solo WebP o AVIF **reales** (revisa los primeros bytes, no el `Content-Type`), hasta 2 MB. Guarda `<prefijo>/<slug>-<hash>.<webp\|avif>` en el bucket `nexbytes` y responde `201 { path }`. |
| `DELETE /upload` | JSON `{ path }`. Solo rutas dentro de esos prefijos. `204`. |
| `POST /publish` | JSON `{ publicacionId, tipo }` → `repository_dispatch` "publicar" en GitHub. Sin `GITHUB_TOKEN` responde `503 { error: "Publicación automática no configurada" }`. |

CORS: `http://localhost:4321`, `https://nexbytes1.web.app` y los canales de preview `https://nexbytes1--*.web.app` (`ALLOWED_ORIGINS` en `wrangler.jsonc`). Otro origen recibe `403`.

### Pruebas y desarrollo local

```powershell
cd workers/nexbytes-api
npm install
npm test        # runner de Vitest para Workers; R2 simulado, nunca toca el bucket real
```

Para `wrangler dev`, crea `workers/nexbytes-api/.dev.vars` (está en `.gitignore`):

```
ADMIN_UID=kcUUn8dbtDdrv50iXDHkcupN8t73
GITHUB_REPO=Krasaid/nexbytes
```

`npm run dev` levanta el Worker en `http://localhost:8787` con un R2 **local** (no el bucket real).

### Desplegar (desde PowerShell)

Requiere `npx wrangler login` (ya hecho). Desde la carpeta del proyecto:

```powershell
cd workers/nexbytes-api
npm install
npx wrangler whoami                     # confirma la cuenta de Cloudflare
npx wrangler deploy                     # crea el Worker "nexbytes-api" y muestra su URL
"kcUUn8dbtDdrv50iXDHkcupN8t73" | npx wrangler secret put ADMIN_UID
"Krasaid/nexbytes" | npx wrangler secret put GITHUB_REPO
npx wrangler secret list                # deben aparecer ADMIN_UID y GITHUB_REPO
cd ../..
node scripts/configure-worker.mjs https://nexbytes-api.<tu-subdominio>.workers.dev
```

- `wrangler deploy` imprime la URL `https://nexbytes-api.<tu-subdominio>.workers.dev`; esa es la que va en `configure-worker.mjs`, que la guarda en `.env` como `PUBLIC_API_URL` (la usará el admin en T21).
- Entre el `deploy` y los secretos, el Worker rechaza todo con 401 (sin `ADMIN_UID` no acepta a nadie). Cada `secret put` publica una nueva versión al momento.
- Comprobación rápida: `curl.exe -s -X POST https://nexbytes-api.<tu-subdominio>.workers.dev/upload` debe responder `{"error":"Debes iniciar sesión."}`. Los registros en vivo: `npx wrangler tail` (dentro de `workers/nexbytes-api`).

### Cuando GitHub Actions vuelva a funcionar

1. En GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token: solo el repositorio `Krasaid/nexbytes`, permiso **Contents: Read and write** (lo exige `repository_dispatch`) y una fecha de vencimiento.
2. Cárgalo (pega el token cuando lo pida; no queda en el historial de PowerShell):

   ```powershell
   cd workers/nexbytes-api
   npx wrangler secret put GITHUB_TOKEN
   ```

3. Reactiva el workflow: `gh workflow enable deploy.yml`.

## Imágenes en Cloudflare R2

En los JSON las imágenes van como ruta relativa (`proyectos/foto.webp`). `cdn()` les antepone `PUBLIC_CDN_URL`.

### CORS del bucket

Las etiquetas `<img>` no necesitan CORS. Sí lo necesitan las fuentes, los videos con `crossorigin` o un `fetch()` desde la página. La configuración está en [`docs/r2-cors.json`](docs/r2-cors.json):

```sh
npx wrangler login
npx wrangler r2 bucket cors set <NOMBRE_DEL_BUCKET> --file docs/r2-cors.json
npx wrangler r2 bucket cors list <NOMBRE_DEL_BUCKET>
```

Desde el panel también se puede: R2 → bucket → Settings → CORS Policy. El panel usa otro formato:

```json
[
  {
    "AllowedOrigins": ["https://nexbytes1.web.app", "https://nexbytes1.firebaseapp.com", "http://localhost:4321", "http://localhost:4322"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

### Dominio propio (por ejemplo `cdn.nexbytes.com`)

El dominio `*.r2.dev` tiene límite de solicitudes y no está pensado para producción.

1. El dominio (`nexbytes.com`) tiene que usar los DNS de Cloudflare.
2. R2 → bucket → Settings → Custom Domains → **Connect Domain** → `cdn.nexbytes.com`. Cloudflare crea el registro DNS y el certificado.
3. Cambia `PUBLIC_CDN_URL=https://cdn.nexbytes.com` en `.env`. La CSP toma el nuevo origen en el siguiente build.
4. Agrega el dominio de la landing a `docs/r2-cors.json` si cambia, y vuelve a aplicarlo.
5. Cuando todo cargue desde el dominio propio, desactiva el acceso público por `r2.dev` (Settings → Public Development URL).

Cuando la landing tenga dominio propio, cambia también `site` en `astro.config.mjs`: de ahí salen el canonical, Open Graph, el sitemap y `robots.txt`.
