// Publicación manual desde Firestore, mientras GitHub Actions (T16) no corre:
//   npm run deploy:cms           pruebas + build con CONTENT_SOURCE=firestore (publicado) + producción
//   npm run deploy:cms:preview   pruebas + build con CONTENT_SOURCE=firestore-borradores + canal "preview" (7 días)
// El build lee Firestore con la cuenta de servicio de GOOGLE_APPLICATION_CREDENTIALS (.env o sistema).
// Es un script de Node porque en Windows npm corre los scripts con cmd, donde `VAR=valor comando` no existe.
import { spawnSync } from 'node:child_process';

const preview = process.argv.includes('--preview');
const fuente = preview ? 'firestore-borradores' : 'firestore';

const pasos = [
  ['Pruebas', 'npm test'],
  [`Build (CONTENT_SOURCE=${fuente})`, 'npx astro build'],
  preview
    ? ['Despliegue al canal preview', 'firebase hosting:channel:deploy preview --expires 7d']
    : ['Despliegue a producción', 'firebase deploy --only hosting'],
];

for (const [nombre, comando] of pasos) {
  console.log(`\n▶ ${nombre}`);
  const r = spawnSync(comando, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CONTENT_SOURCE: fuente },
  });
  if (r.status !== 0) {
    console.error(`\n✖ Falló: ${nombre}. No se desplegó nada${nombre.startsWith('Despliegue') ? ' (o quedó a medias)' : ''}.`);
    process.exit(r.status ?? 1);
  }
}
