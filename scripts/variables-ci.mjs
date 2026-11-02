// @ts-check
/**
 * Paso "Revisar configuración" de .github/workflows/deploy.yml:
 *   env: VARIABLES: ${{ toJSON(vars) }}  →  node scripts/variables-ci.mjs
 *
 * Pasa al resto del job (GITHUB_ENV) todas las variables PUBLIC_* del repositorio, sin
 * listarlas en el YAML, y revisa las obligatorias de scripts/lib/variables-publicas.mjs.
 * Así una variable nueva solo se agrega a esa lista y con `gh variable set`.
 * Sin dependencias: corre antes de `npm ci`.
 */
import { appendFileSync } from 'node:fs';

import { SOLO_DESARROLLO, mensajeVariables, revisarVariables } from './lib/variables-publicas.mjs';

/** @param {string} texto */
const error = (texto) => console.log(`::error::${texto.replaceAll('\n', '%0A')}`);

/** @type {Record<string, unknown>} */
let variables;
try {
  variables = JSON.parse(process.env.VARIABLES || '{}');
} catch {
  error('VARIABLES no es un JSON válido.');
  process.exit(1);
}

const solo = /** @type {readonly string[]} */ (SOLO_DESARROLLO);
/** @type {Record<string, string>} */
const publicas = {};
for (const [nombre, valor] of Object.entries(variables)) {
  if (!/^PUBLIC_[A-Z0-9_]+$/.test(nombre) || solo.includes(nombre) || typeof valor !== 'string') continue;
  // Un salto de línea permitiría inyectar otras variables en GITHUB_ENV.
  if (/[\r\n]/.test(valor)) {
    error(`${nombre} tiene saltos de línea.`);
    process.exit(1);
  }
  publicas[nombre] = valor.trim();
}

const problemas = revisarVariables(publicas);
if (problemas.length) {
  error(mensajeVariables(problemas));
  process.exit(1);
}

const destino = process.env.GITHUB_ENV;
if (!destino) {
  error('Falta GITHUB_ENV (este script es para GitHub Actions).');
  process.exit(1);
}
appendFileSync(destino, Object.entries(publicas).map(([k, v]) => `${k}=${v}\n`).join(''));
console.log(`Variables para el build: ${Object.keys(publicas).sort().join(', ')}`);
