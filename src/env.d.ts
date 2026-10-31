interface ImportMetaEnv {
  readonly PUBLIC_CDN_URL: string;
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_RECAPTCHA_SITE_KEY: string;
  /** Solo desarrollo: "host:puerto" del emulador de Firestore. */
  readonly PUBLIC_FIRESTORE_EMULATOR?: string;
  /** Solo build: local (por defecto), firestore o firestore-borradores. Ver src/lib/content.ts. */
  readonly CONTENT_SOURCE?: string;
  /** Solo build y npm run seed: ruta al JSON de la cuenta de servicio (fuera del repo). */
  readonly GOOGLE_APPLICATION_CREDENTIALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
