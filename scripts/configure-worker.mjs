// Guarda la URL del Worker (workers/nexbytes-api) en .env como PUBLIC_API_URL,
// para que el admin sepa adónde subir imágenes y pedir publicaciones.
// Uso: node scripts/configure-worker.mjs https://nexbytes-api.<tu-subdominio>.workers.dev
// (Adaptado del script del portafolio.)
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const valor = process.argv[2];
let url;
try {
  url = new URL(valor);
} catch {
  console.error('Uso: node scripts/configure-worker.mjs https://nexbytes-api.<tu-subdominio>.workers.dev');
  process.exit(1);
}
const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
if ((url.protocol !== 'https:' && !local) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
  console.error('Usa la URL raíz del Worker: https://… (o http://localhost:8787 para wrangler dev).');
  process.exit(1);
}

const ruta = new URL('../.env', import.meta.url);
let contenido = existsSync(ruta) ? await readFile(ruta, 'utf8') : '';
const linea = `PUBLIC_API_URL=${url.origin}`;
contenido = /^PUBLIC_API_URL=.*$/m.test(contenido)
  ? contenido.replace(/^PUBLIC_API_URL=.*$/m, () => linea)
  : `${contenido.trimEnd()}\n${linea}\n`;
await writeFile(ruta, contenido);
console.log(`Listo: ${linea} en .env`);
