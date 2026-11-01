# Pendientes

Lo que falta para dejar el sitio y el CMS completos, con quién lo hace y cómo. Todo esto lo haces tú (consola, facturación o secretos). Cuando algo quede hecho, bórralo de aquí.

## Ahora (después del cierre del CMS, T24)

- [ ] **Desplegar el Worker** con el límite de subidas y los errores sin detalles internos. Crea el Durable Object `LimiteSubidas` (migración `v1`):

  ```powershell
  cd workers/nexbytes-api
  npx wrangler deploy
  ```

  Comprueba que la salida liste `env.LIMITE_SUBIDAS (LimiteSubidas)`. Si Cloudflare pide aceptar Durable Objects, el plan gratuito los incluye (con almacenamiento SQLite).
- [ ] **Firebase Auth** (Consola de Firebase → Authentication → **Settings**):
  - **User actions:** desmarca **Enable create (sign-up)** y **Enable delete**. Así nadie puede crearse una cuenta desde el navegador con la clave pública de la app; la cuenta admin ya existe y sigue entrando. Si algún día necesitas otra cuenta, créala desde Authentication → Users → Add user.
  - **Email enumeration protection** (en la misma pantalla de Settings): actívala. El login deja de revelar si un correo tiene cuenta (el panel ya muestra el mismo "Correo o contraseña incorrectos" en los dos casos).
- [ ] **Restringir la clave web de Firebase** (`AIzaSy…`). Es pública por diseño (va en el JavaScript del sitio y quedó en el historial de git), pero conviene acotarla. En Google Cloud Console → APIs y servicios → Credenciales → la clave "Browser key":
  - **Restricciones de aplicaciones:** sitios web: `https://nexbytes1.web.app/*`, `https://nexbytes1.firebaseapp.com/*`, `https://nexbytes1--*.web.app/*`, `http://localhost/*` y `http://127.0.0.1/*` (más el dominio propio cuando exista).
  - **Restricciones de API:** solo Cloud Firestore API, Identity Toolkit API, Token Service API y Firebase App Check API.
  - Después prueba el panel (entrar, guardar, subir una imagen) y los formularios del sitio.
- [ ] **Subir los commits locales** (13 o más sin push) cuando lo decidas: `git push`. Mientras Actions esté desactivado, el push no despliega nada.

## GitHub Actions (T16 sin verificar)

El workflow `.github/workflows/deploy.yml` está escrito pero nunca corrió: Actions no arranca por un bloqueo de facturación de la cuenta de GitHub. Está desactivado y se publica a mano con `npm run deploy:cms` / `npm run deploy:cms:preview` (ver `docs/CMS.md`).

- [ ] Resolver la facturación en GitHub → Settings → Billing and plans.
- [ ] Cargar los secretos y variables del README ("Despliegue automático") si no están: `FIREBASE_SERVICE_ACCOUNT` y las `PUBLIC_*`.
- [ ] Crear el token fine-grained y cargarlo en el Worker: `npx wrangler secret put GITHUB_TOKEN` (README, "Cuando GitHub Actions vuelva a funcionar").
- [ ] `gh workflow enable deploy.yml`.
- [ ] Verificarlo con una vista previa de prueba (README, "Probar un despliegue a preview"), luego con el botón **Vista previa** del panel y por último con **Publicar**. Si todo responde, marca T16 como `[x]` en `docs/TAREAS-CMS.md`.

## Dominio propio

- [ ] **Sitio** (por ejemplo `nexbytes.com`): Firebase → Hosting → **Agregar dominio personalizado** y seguir los registros DNS. Luego:
  - `site` en `astro.config.mjs` (canonical, Open Graph, sitemap y `robots.txt`);
  - el dominio en `ALLOWED_ORIGINS` del Worker (`wrangler.jsonc`) y `npx wrangler deploy`;
  - Firebase → Authentication → Settings → **Authorized domains**;
  - el dominio en la restricción de la clave web (arriba) y en los dominios de la clave de reCAPTCHA (App Check);
  - el dominio en `docs/r2-cors.json`.
- [ ] **CDN de imágenes** (por ejemplo `cdn.nexbytes.com`): R2 → bucket `nexbytes` → Settings → Custom Domains. Pasos en el README ("Dominio propio"). El `r2.dev` actual tiene límite de solicitudes y no está pensado para producción. Al cambiar `PUBLIC_CDN_URL`, la CSP del sitio y la del panel se actualizan solas en el siguiente build; las rutas guardadas en el contenido no cambian.

## CORS de R2

- [ ] Aplicar `docs/r2-cors.json` al bucket `nexbytes` (README, "CORS del bucket") y revisarlo con `npx wrangler r2 bucket cors list nexbytes`. Hoy no es imprescindible porque las `<img>` no lo necesitan, pero sí lo necesita un video con `crossorigin` o un `fetch()` a una imagen. Agrega cada dominio nuevo cuando exista.

## Contenido del producto propio (SaaS)

- [ ] En el panel → Contenido → **Producto**: nombre, descripción y los tres beneficios todavía son marcadores (`[NOMBRE DEL SAAS]`, `[Beneficio principal 1]`…). La sección está oculta (**Visible** apagado), así que no se ve en el sitio. Cuando tengas el texto: complétalo, activa Visible, revisa con una vista previa y publica.

## App Check: enforcement

App Check verifica que las solicitudes a Firestore vengan del sitio real (reCAPTCHA v3) y, en desarrollo, de los navegadores con token de depuración. Hoy solo **mide**: una solicitud sin verificar todavía pasa.

- [ ] En Firebase → App Check → **APIs → Cloud Firestore**, revisa las métricas de unos días. Activa el enforcement cuando casi todas las solicitudes salgan como "verificadas".
- [ ] Antes de activarlo, registra el token de depuración de cada navegador desde el que uses el panel en local (`docs/CMS.md`, "Si algo falla").
- [ ] Después de activarlo, prueba el cotizador y la lista de espera del sitio publicado, y el panel. El build y `npm run seed` usan la cuenta de servicio, así que no les afecta.
- [ ] Opcional: App Check para **Authentication** (mismo panel, API "Identity Toolkit"), con el mismo criterio.

## Ya verificado (para referencia)

- Encabezados del panel en el canal de vista previa (2026-10-31): `/admin` responde `Cache-Control: no-store`, `frame-ancestors 'none'`, `X-Frame-Options: DENY` y `X-Robots-Tag: noindex`. En producción el `noindex` sale de `firebase.json` (en las vistas previas Firebase lo fuerza en todas las páginas).
