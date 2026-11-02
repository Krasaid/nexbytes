// @ts-check
/**
 * Única lista de las variables PUBLIC_* del proyecto. La usan:
 * - astro.config.mjs: `astro build` falla si falta una obligatoria (local, deploy:cms y CI);
 * - scripts/variables-ci.mjs: el workflow pasa al build todas las PUBLIC_* del repositorio
 *   y revisa esta lista antes de instalar nada;
 * - tests/unit/variables-publicas.test.ts: toda `PUBLIC_*` que aparezca en src/ tiene que estar aquí.
 *
 * Una variable nueva = agregarla aquí (y a .env.example, src/env.d.ts y `gh variable set`).
 * Sin dependencias: el workflow la usa antes de `npm ci`.
 */

/** Las necesita el sitio publicado. `url: true` exige una URL http(s) válida (se usa su origen en la CSP). */
export const OBLIGATORIAS = /** @type {const} */ ([
  { nombre: 'PUBLIC_CDN_URL', url: true },
  { nombre: 'PUBLIC_FIREBASE_API_KEY' },
  { nombre: 'PUBLIC_FIREBASE_AUTH_DOMAIN' },
  { nombre: 'PUBLIC_FIREBASE_PROJECT_ID' },
  { nombre: 'PUBLIC_FIREBASE_APP_ID' },
  { nombre: 'PUBLIC_RECAPTCHA_SITE_KEY' },
  { nombre: 'PUBLIC_API_URL', url: true },
]);

/** Solo `astro dev` (emuladores); el código las ignora fuera de desarrollo y CI no las exporta. */
export const SOLO_DESARROLLO = /** @type {const} */ (['PUBLIC_FIRESTORE_EMULATOR', 'PUBLIC_AUTH_EMULATOR']);

/**
 * Problemas de configuración, uno por variable (vacío si todo está bien).
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function revisarVariables(env) {
  const problemas = [];
  for (const { nombre, ...opciones } of OBLIGATORIAS) {
    const valor = env[nombre]?.trim();
    if (!valor) {
      problemas.push(`${nombre}: falta o está vacía`);
    } else if ('url' in opciones && !esUrlHttp(valor)) {
      problemas.push(`${nombre}: no es una URL http(s) válida`);
    }
  }
  return problemas;
}

/** @param {string} valor */
function esUrlHttp(valor) {
  try {
    return ['http:', 'https:'].includes(new URL(valor).protocol);
  } catch {
    return false;
  }
}

/**
 * Mensaje de error para el build.
 * @param {string[]} problemas
 */
export function mensajeVariables(problemas) {
  return [
    'Faltan variables de entorno o no son válidas. No se construye un sitio sin ellas:',
    ...problemas.map((p) => `  - ${p}`),
    'En local van en .env (ver .env.example); en GitHub Actions, como variables del repositorio (gh variable set, ver README).',
  ].join('\n');
}
