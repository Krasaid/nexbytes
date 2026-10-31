// Corre tests/e2e (Playwright) contra los emuladores de Auth y Firestore (npm run test:e2e).
// El servidor de Astro lo levanta Playwright (playwright.config.ts) apuntando a los emuladores;
// nunca toca el proyecto real.
// En Windows, `firebase emulators:exec` deja vivo el java del emulador de Firestore: aquí se cierra,
// como en scripts/test-rules.mjs.
import { execSync, spawnSync } from 'node:child_process';

const PUERTOS = [8080, 9099]; // firebase.json → emulators.firestore / emulators.auth

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

const ocupadosAntes = new Set(PUERTOS.filter((p) => pidEscuchando(p)));
if (ocupadosAntes.size) {
  console.error(`Los puertos ${[...ocupadosAntes].join(', ')} ya están en uso: cierra los emuladores abiertos y vuelve a correr.`);
  process.exit(1);
}

const extra = process.argv.slice(2).join(' ');
const r = spawnSync(
  `firebase emulators:exec --only auth,firestore --project demo-nexbytes "npx playwright test ${extra}"`,
  { stdio: 'inherit', shell: true },
);

for (const puerto of PUERTOS) {
  const pid = pidEscuchando(puerto);
  if (pid) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
}

process.exit(r.status ?? 1);
