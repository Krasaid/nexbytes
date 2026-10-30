/**
 * Firebase en el cliente. Este módulo NO se importa de forma estática:
 * forms.ts lo carga con `import()` solo cuando alguien envía un formulario,
 * así la página no descarga Firebase al abrirse.
 *
 * - App Check con reCAPTCHA v3 (PUBLIC_RECAPTCHA_SITE_KEY).
 * - En desarrollo usa el token de depuración de App Check (hay que registrarlo
 *   una vez en la consola). En el build de producción ese bloque no existe.
 * - Firestore Lite: escribe por REST, sin caché ni cola offline. Si no hay red,
 *   falla en vez de quedarse esperando.
 */
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

let db: Firestore | undefined;

export function getDb(): Firestore {
  if (db) return db;

  const app = initializeApp({
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
  });

  if (import.meta.env.DEV) {
    // Imprime en la consola del navegador el token que hay que registrar en
    // Firebase Console → App Check → Apps → Administrar tokens de depuración.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });

  db = getFirestore(app);

  if (import.meta.env.DEV && import.meta.env.PUBLIC_FIRESTORE_EMULATOR) {
    const [host, port] = import.meta.env.PUBLIC_FIRESTORE_EMULATOR.split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }

  return db;
}
