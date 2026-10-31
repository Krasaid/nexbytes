/**
 * npm run seed: sube los JSON de src/content/data/ a Firestore, en
 * `borradores/{bloque}` y `publicado/{bloque}`, con la misma `version`.
 *
 * - Valida cada JSON con su schema antes de tocar Firestore: si uno falla, no sube nada.
 * - Usa firebase-admin con la cuenta de servicio de GOOGLE_APPLICATION_CREDENTIALS
 *   (variable del sistema o línea en .env; el JSON vive fuera del repo).
 * - Si algún documento ya existe, muestra cuáles y pide escribir el ID del
 *   proyecto antes de sobrescribir.
 *
 * Opciones:
 *   --dry-run   valida y muestra lo que haría, sin escribir
 *   --yes       no pregunta (para scripts)
 * Con FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 escribe en el emulador (proyecto demo-nexbytes).
 */
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';

import { NOMBRES_BLOQUES, type Bloque } from '../src/lib/bloques';
import { siguienteVersion, validarBloques } from './lib/semilla';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sinPreguntar = args.includes('--yes');

function leerBloques(): Partial<Record<Bloque, unknown>> {
  const datos: Partial<Record<Bloque, unknown>> = {};
  for (const nombre of NOMBRES_BLOQUES) {
    const ruta = new URL(`../src/content/data/${nombre}.json`, import.meta.url);
    if (existsSync(ruta)) datos[nombre] = JSON.parse(readFileSync(ruta, 'utf8'));
  }
  return datos;
}

/** ID del proyecto de la cuenta de servicio, comprobado contra .env para no escribir en otro proyecto. */
function proyecto(): string {
  if (process.env.FIRESTORE_EMULATOR_HOST) return 'demo-nexbytes';

  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!ruta) {
    throw new Error(
      'Falta GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la cuenta de servicio (guárdalo fuera del repo).',
    );
  }
  if (!existsSync(ruta)) throw new Error(`No existe el archivo de la cuenta de servicio: ${ruta}`);

  const projectId: unknown = JSON.parse(readFileSync(ruta, 'utf8')).project_id;
  if (typeof projectId !== 'string' || !projectId) throw new Error('El JSON de la cuenta de servicio no tiene project_id.');

  const esperado = process.env.PUBLIC_FIREBASE_PROJECT_ID;
  if (esperado && esperado !== projectId) {
    throw new Error(`La cuenta de servicio es del proyecto "${projectId}", pero .env dice "${esperado}".`);
  }
  return projectId;
}

async function confirmar(projectId: string): Promise<boolean> {
  if (sinPreguntar) return true;
  if (!process.stdin.isTTY) throw new Error('Hay documentos que se sobrescribirían. Corre de nuevo con --yes para confirmar.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(`\nPara sobrescribir, escribe el ID del proyecto (${projectId}): `);
  rl.close();
  return respuesta.trim() === projectId;
}

function versionDe(snap: DocumentSnapshot): unknown {
  return snap.exists ? snap.get('version') : undefined;
}

async function main() {
  const validacion = validarBloques(leerBloques());
  if (!validacion.ok) {
    throw new Error(`No se subió nada.\n\n${validacion.errores.join('\n\n')}`);
  }
  const { bloques } = validacion;

  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin .env: se usan solo las variables del sistema.
  }

  const projectId = proyecto();
  const app = initializeApp(
    process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId },
  );
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const refs = NOMBRES_BLOQUES.flatMap((nombre) => [
    db.doc(`borradores/${nombre}`),
    db.doc(`publicado/${nombre}`),
  ]);

  const previos = await db.getAll(...refs);
  const existentes = previos.filter((s) => s.exists).length;

  console.log(`Proyecto: ${projectId}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulador)' : ''}\n`);
  NOMBRES_BLOQUES.forEach((nombre, i) => {
    const [borrador, publicado] = [previos[2 * i], previos[2 * i + 1]];
    const nueva = siguienteVersion(versionDe(borrador), versionDe(publicado));
    const estado =
      borrador.exists || publicado.exists
        ? `sobrescribe (borrador v${versionDe(borrador) ?? '-'}, publicado v${versionDe(publicado) ?? '-'})`
        : 'nuevo';
    console.log(`  ${nombre.padEnd(10)} ${estado} → v${nueva}`);
  });

  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada.');
    return;
  }
  if (existentes > 0 && !(await confirmar(projectId))) {
    console.log('Cancelado: no se escribió nada.');
    process.exitCode = 1;
    return;
  }

  // En una transacción: si alguien guarda mientras se confirma, la version se recalcula.
  await db.runTransaction(async (tx) => {
    const actuales = await tx.getAll(...refs);
    NOMBRES_BLOQUES.forEach((nombre, i) => {
      const version = siguienteVersion(versionDe(actuales[2 * i]), versionDe(actuales[2 * i + 1]));
      const doc = { ...bloques[nombre], version, actualizadoEn: FieldValue.serverTimestamp() };
      tx.set(refs[2 * i], doc);
      tx.set(refs[2 * i + 1], doc);
    });
  });

  console.log(`\nListo: ${NOMBRES_BLOQUES.length} bloques en borradores y publicado.`);
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  // Por si un error de Google trae un token o parte de la llave.
  console.error(mensaje.replace(/ya29\.[\w.-]+|-----BEGIN [\s\S]*?-----END [A-Z ]+-----/g, '[OCULTO]'));
  process.exitCode = 1;
});
