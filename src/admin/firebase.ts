/**
 * Auth y Firestore del admin, sobre la misma app (y App Check) de la landing.
 *
 * - Auth con persistencia de sesión: la sesión sobrevive a recargar la página,
 *   pero se cierra al cerrar la pestaña.
 * - Firestore completo (no Lite): el admin necesita onSnapshot.
 * - En desarrollo, PUBLIC_AUTH_EMULATOR y PUBLIC_FIRESTORE_EMULATOR apuntan a
 *   los emuladores (así corren las pruebas de tests/e2e).
 */
import { browserSessionPersistence, connectAuthEmulator, initializeAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { firestoreEmulador, getFirebaseApp } from '../lib/firebase';

const authEmulador = import.meta.env.DEV ? import.meta.env.PUBLIC_AUTH_EMULATOR : undefined;

let servicios: { auth: Auth; db: Firestore } | undefined;

export function getServicios(): { auth: Auth; db: Firestore } {
  if (servicios) return servicios;

  const app = getFirebaseApp();
  // Sin popupRedirectResolver: el login es con correo y contraseña, no hacen falta iframes de Google.
  const auth = initializeAuth(app, { persistence: browserSessionPersistence });
  const db = getFirestore(app);

  if (authEmulador) connectAuthEmulator(auth, `http://${authEmulador}`, { disableWarnings: true });
  if (firestoreEmulador) {
    const [host, port] = firestoreEmulador.split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }

  servicios = { auth, db };
  return servicios;
}
