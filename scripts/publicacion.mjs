/**
 * Historial de publicaciones (publicaciones/{id}) desde GitHub Actions o la terminal.
 *
 *   node scripts/publicacion.mjs construyendo <id>
 *   node scripts/publicacion.mjs publicada <id> <url>
 *   node scripts/publicacion.mjs error <id> "<mensaje>" [--log <archivo del build>] [--enlace <url de la ejecución>]
 *   node scripts/publicacion.mjs solicitar <preview|produccion>   crea una solicitud de prueba e imprime su id
 *   node scripts/publicacion.mjs ver <id>
 *
 * Sin dependencias (REST de Firestore + node:crypto), para que el workflow pueda
 * marcar `error` aunque `npm ci` haya fallado. Lee la cuenta de servicio de
 * GOOGLE_APPLICATION_CREDENTIALS (variable del sistema o .env) y nunca imprime
 * su contenido ni el token.
 */
import { sign, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { escrituraEstado, escrituraSolicitud, mensajeDeError, mensajeLegible, resumirBuild } from './lib/publicacion.mjs';

const FIRESTORE = 'https://firestore.googleapis.com/v1';

function cuentaDeServicio() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin .env (CI): solo variables del sistema.
  }
  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!ruta || !existsSync(ruta)) throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS o el archivo no existe.');
  let cuenta;
  try {
    cuenta = JSON.parse(readFileSync(ruta, 'utf8'));
  } catch {
    // El error de JSON.parse incluye un pedazo del texto: no se muestra.
    throw new Error('El archivo de la cuenta de servicio no es un JSON válido.');
  }
  if (!cuenta.project_id || !cuenta.client_email || !cuenta.private_key) {
    throw new Error('El archivo no parece una cuenta de servicio (faltan project_id, client_email o private_key).');
  }
  return cuenta;
}

/** Token de acceso OAuth a partir de la cuenta de servicio (JWT firmado con RS256). */
async function token(cuenta) {
  const aud = cuenta.token_uri || 'https://oauth2.googleapis.com/token';
  const ahora = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const datos = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: cuenta.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud,
    iat: ahora,
    exp: ahora + 600,
  })}`;
  const firma = sign('RSA-SHA256', Buffer.from(datos), cuenta.private_key).toString('base64url');

  const r = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${datos}.${firma}` }),
  });
  if (!r.ok) throw new Error(`Google rechazó la cuenta de servicio (HTTP ${r.status}).`);
  return (await r.json()).access_token;
}

async function pedir(cuenta, metodo, ruta, body) {
  const r = await fetch(`${FIRESTORE}/projects/${cuenta.project_id}/databases/(default)/documents${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await token(cuenta)}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Firestore respondió HTTP ${r.status}: ${json.error?.message ?? 'sin detalle'}`);
  return json;
}

const commit = (cuenta, escritura) => pedir(cuenta, 'POST', ':commit', { writes: [escritura] });

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  return i < 0 ? undefined : args[i + 1];
}

async function main() {
  const [accion, ...args] = process.argv.slice(2);
  const cuenta = cuentaDeServicio();
  const p = cuenta.project_id;

  switch (accion) {
    case 'construyendo':
      await commit(cuenta, escrituraEstado(p, args[0], { estado: 'construyendo' }));
      break;
    case 'publicada':
      if (!args[1]) throw new Error('Falta la URL.');
      await commit(cuenta, escrituraEstado(p, args[0], { estado: 'publicada', url: args[1] }));
      break;
    case 'error': {
      const log = opcion(args, '--log');
      const resumen = log && existsSync(log) ? resumirBuild(readFileSync(log, 'utf8')) : '';
      const mensaje = mensajeDeError(args[1], resumen, opcion(args, '--enlace'));
      await commit(cuenta, escrituraEstado(p, args[0], { estado: 'error', error: mensaje }));
      break;
    }
    case 'solicitar': {
      const id = randomBytes(15).toString('base64url').replace(/[-_]/g, '').slice(0, 20);
      await commit(cuenta, escrituraSolicitud(p, id, args[0]));
      console.log(id);
      return;
    }
    case 'ver': {
      const doc = await pedir(cuenta, 'GET', `/publicaciones/${encodeURIComponent(args[0] ?? '')}`);
      const valores = Object.fromEntries(
        Object.entries(doc.fields ?? {}).map(([k, v]) => [k, v.stringValue ?? v.timestampValue ?? JSON.stringify(v)]),
      );
      console.log(JSON.stringify(valores, null, 2));
      return;
    }
    default:
      throw new Error('Acción desconocida. Usa construyendo, publicada, error, solicitar o ver.');
  }
  console.log(`publicaciones/${args[0]}: ${accion}`);
}

main().catch((error) => {
  console.error(mensajeLegible(error instanceof Error ? error.message : String(error), 500));
  process.exitCode = 1;
});
