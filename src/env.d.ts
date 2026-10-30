interface ImportMetaEnv {
  readonly PUBLIC_CDN_URL: string;
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_RECAPTCHA_SITE_KEY: string;
  /** Solo desarrollo: "host:puerto" del emulador de Firestore. */
  readonly PUBLIC_FIRESTORE_EMULATOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
