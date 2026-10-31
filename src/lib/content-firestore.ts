/**
 * Lectura del contenido desde Firestore en tiempo de build
 * (CONTENT_SOURCE=firestore o firestore-borradores). Solo la usa content.ts,
 * con import(), así el build local nunca carga firebase-admin.
 *
 * - Lee con firebase-admin y la cuenta de servicio (GOOGLE_APPLICATION_CREDENTIALS),
 *   que se salta App Check y las reglas: ninguna colección de contenido es pública.
 * - Lee los bloques de una vez (un solo getAll por build) y falla si falta alguno:
 *   nunca se construye un sitio con contenido vacío.
 * - Con FIRESTORE_EMULATOR_HOST lee del emulador (proyecto demo-nexbytes).
 */
import { existsSync } from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { NOMBRES_BLOQUES, type Bloque } from './bloques';

export type Coleccion = 'publicado' | 'borradores';

const NOMBRE_APP = 'nexbytes-build';

const lecturas = new Map<Coleccion, Promise<Record<Bloque, unknown>>>();

/** Los datos crudos de cada bloque en `coleccion`. Se leen una sola vez por build. */
export function leerBloques(coleccion: Coleccion): Promise<Record<Bloque, unknown>> {
  let lectura = lecturas.get(coleccion);
  if (!lectura) {
    lectura = leer(coleccion);
    lecturas.set(coleccion, lectura);
  }
  return lectura;
}

async function leer(coleccion: Coleccion): Promise<Record<Bloque, unknown>> {
  const db = getFirestore(app());
  let snaps;
  try {
    snaps = await db.getAll(...NOMBRES_BLOQUES.map((nombre) => db.doc(`${coleccion}/${nombre}`)));
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo leer el contenido de Firestore (${coleccion}): ${detalle}`);
  }

  const faltan = NOMBRES_BLOQUES.filter((_, i) => !snaps[i].exists);
  if (faltan.length) {
    throw new Error(
      `Faltan bloques en Firestore ${coleccion}/: ${faltan.join(', ')}. ` +
        'Corre npm run seed o publica desde el admin; no se construye el sitio con contenido incompleto.',
    );
  }
  return Object.fromEntries(NOMBRES_BLOQUES.map((nombre, i) => [nombre, snaps[i].data()])) as Record<Bloque, unknown>;
}

function app(): App {
  const existente = getApps().find((a) => a.name === NOMBRE_APP);
  if (existente) return existente;

  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: 'demo-nexbytes' }, NOMBRE_APP);

  // En CI llega como variable del sistema; en local puede estar en .env (Astro no lo pasa a process.env).
  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS || import.meta.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (ruta && !existsSync(ruta)) throw new Error(`No existe el archivo de la cuenta de servicio: ${ruta}`);

  return initializeApp(
    {
      credential: ruta ? cert(ruta) : applicationDefault(),
      projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || undefined,
    },
    NOMBRE_APP,
  );
}
