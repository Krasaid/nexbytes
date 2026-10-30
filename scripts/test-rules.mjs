// Corre tests/rules contra el emulador de Firestore (npm run test:rules).
// En Windows, `firebase emulators:exec` deja vivo el proceso java del emulador
// al terminar y la siguiente corrida falla con "port taken": aquí se cierra.
import { execSync, spawnSync } from 'node:child_process';

const PUERTO = 8080; // el de firebase.json → emulators.firestore.port

function pidEscuchando(puerto) {
  if (process.platform !== 'win32') return undefined;
  try {
    const salida = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${puerto}`, { encoding: 'utf8' });
    const linea = salida.split('\n').find((l) => l.trim().split(/\s+/)[1]?.endsWith(`:${puerto}`));
    return linea?.trim().split(/\s+/).at(-1);
  } catch {
    return undefined; // findstr sin resultados
  }
}

const ocupadoAntes = pidEscuchando(PUERTO);

const r = spawnSync(
  'firebase emulators:exec --only firestore --project demo-nexbytes "vitest run tests/rules --testTimeout=20000"',
  { stdio: 'inherit', shell: true },
);

// Solo se cierra lo que levantó esta corrida.
const pid = pidEscuchando(PUERTO);
if (pid && !ocupadoAntes) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });

process.exit(r.status ?? 1);
