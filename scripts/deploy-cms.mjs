// Publicación manual desde Firestore, mientras GitHub Actions (T16) no corre:
//   npm run deploy:cms           pruebas + build con CONTENT_SOURCE=firestore (publicado) + producción
//   npm run deploy:cms:preview   pruebas + build con CONTENT_SOURCE=firestore-borradores + canal "preview" (7 días)
//
// Cada paso recibe solo las variables que le corresponden:
// - Las pruebas y el despliegue corren SIN CONTENT_SOURCE ni GOOGLE_APPLICATION_CREDENTIALS
//   (las pruebas no deben depender del entorno, y firebase deploy usaría la cuenta de
//   servicio en lugar de tu sesión de Firebase CLI).
// - Solo el build lee Firestore: CONTENT_SOURCE, y la cuenta de servicio de
//   GOOGLE_APPLICATION_CREDENTIALS (de la terminal o, si no, Astro la toma de .env).
// Es un script de Node porque en Windows npm corre los scripts con cmd, donde `VAR=valor comando` no existe.
import { spawnSync } from 'node:child_process';

const preview = process.argv.includes('--preview');
const fuente = preview ? 'firestore-borradores' : 'firestore';

const { CONTENT_SOURCE: _fuente, GOOGLE_APPLICATION_CREDENTIALS: credenciales, ...limpio } = process.env;
const paraBuild = { ...limpio, CONTENT_SOURCE: fuente, ...(credenciales ? { GOOGLE_APPLICATION_CREDENTIALS: credenciales } : {}) };

const pasos = [
  { nombre: 'Pruebas', comando: 'npm test', env: limpio },
  { nombre: `Build (CONTENT_SOURCE=${fuente})`, comando: 'npx astro build', env: paraBuild },
  preview
    ? { nombre: 'Despliegue al canal preview', comando: 'firebase hosting:channel:deploy preview --expires 7d', env: limpio }
    : { nombre: 'Despliegue a producción', comando: 'firebase deploy --only hosting', env: limpio },
];

for (const { nombre, comando, env } of pasos) {
  console.log(`\n▶ ${nombre}`);
  const r = spawnSync(comando, { stdio: 'inherit', shell: true, env });
  if (r.status !== 0) {
    console.error(`\n✖ Falló: ${nombre}. No se desplegó nada${nombre.startsWith('Despliegue') ? ' (o quedó a medias)' : ''}.`);
    process.exit(r.status ?? 1);
  }
}
