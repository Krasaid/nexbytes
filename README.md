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
| `npm run emulators` | Emulador de Firestore para probar formularios en local |
| `npm run deploy:preview` | Pruebas + build + canal de vista previa `preview` (vence en 7 días) |
| `npm run deploy` | Pruebas + build + publicar en producción |
| `npm run deploy:rules` | Publicar `firestore.rules` |

## Despliegue

- **Hosting** (`firebase.json`): sitio `nexbytes1`, carpeta `dist/`.
  - URLs limpias: `/404` en vez de `/404.html`, sin barra final.
  - Caché: el HTML no se guarda (`no-cache`, siempre se revalida). `/_astro/**` (JS, CSS y fuentes con hash en el nombre) se guarda un año como `immutable`. Íconos e imágenes de `public/`, un día.
  - Headers de seguridad: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` y `frame-ancestors 'none'`.
- **Reglas de Firestore**: se publican aparte con `npm run deploy:rules`. El público solo puede crear en `cotizaciones` y `lista_espera`; ahí el admin solo puede leer y cambiar `estado` y `notas`. El contenido del CMS (`borradores`, `publicado`) y `publicaciones` son solo del admin.
- **App Check (reCAPTCHA v3)**: no actives el *enforcement* de Firestore hasta ver en la consola (App Check → Firestore) que las solicitudes llegan verificadas. Para desarrollo local, registra el token de depuración que imprime la consola del navegador con `npm run dev` (App Check → Apps → Administrar tokens de depuración).

### Despliegue automático (GitHub Actions)

`.github/workflows/deploy.yml` construye y despliega en GitHub, leyendo el contenido de Firestore:

| Disparador | Contenido | Destino |
| --- | --- | --- |
| `push` a `main` | `publicado` | Producción |
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
