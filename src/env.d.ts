// Las PUBLIC_* obligatorias (el build falla sin ellas) están en scripts/lib/variables-publicas.mjs.
interface ImportMetaEnv {
  readonly PUBLIC_CDN_URL: string;
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_RECAPTCHA_SITE_KEY: string;
  /** URL del Worker workers/nexbytes-api (subida de imágenes y publicación). Obligatoria en el build. */
  readonly PUBLIC_API_URL: string;
  /** Solo desarrollo: "host:puerto" del emulador de Firestore. */
  readonly PUBLIC_FIRESTORE_EMULATOR?: string;
  /** Solo desarrollo: "host:puerto" del emulador de Auth (admin). */
  readonly PUBLIC_AUTH_EMULATOR?: string;
  /** Solo build: local (por defecto), firestore o firestore-borradores. Ver src/lib/content.ts. */
  readonly CONTENT_SOURCE?: string;
  /** Solo build y npm run seed: ruta al JSON de la cuenta de servicio (fuera del repo). */
  readonly GOOGLE_APPLICATION_CREDENTIALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
