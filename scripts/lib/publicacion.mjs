/**
 * Lógica pura de scripts/publicacion.mjs (sin red ni disco), para probarla con
 * Vitest: tests/unit/publicacion.test.ts. Sin dependencias: el workflow la usa
 * incluso cuando `npm ci` falló.
 */

/** IDs de documento que se aceptan (los automáticos de Firestore tienen 20 caracteres). */
export const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export const TIPOS = ['produccion', 'preview'];

/** Largo máximo del mensaje de error que se guarda en publicaciones/{id}. */
export const MENSAJE_MAX = 300;

const documento = (proyecto, id) => `projects/${proyecto}/databases/(default)/documents/publicaciones/${id}`;

const campos = (datos) => Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, { stringValue: v }]));

/**
 * Escritura (formato `documents:commit` de la API REST) que cambia el estado de
 * una publicación existente. `publicada` y `error` agregan `terminadaEn` con la
 * hora del servidor.
 * @param {string} proyecto
 * @param {string} id
 * @param {{ estado: 'construyendo' } | { estado: 'publicada', url: string } | { estado: 'error', error: string }} cambio
 */
export function escrituraEstado(proyecto, id, cambio) {
  if (!ID_VALIDO.test(id)) throw new Error('publicacionId inválido.');
  return {
    update: { name: documento(proyecto, id), fields: campos(cambio) },
    updateMask: { fieldPaths: Object.keys(cambio) },
    currentDocument: { exists: true },
    ...(cambio.estado !== 'construyendo' && {
      updateTransforms: [{ fieldPath: 'terminadaEn', setToServerValue: 'REQUEST_TIME' }],
    }),
  };
}

/** Escritura que crea una solicitud igual a la que creará el admin (para pruebas manuales). */
export function escrituraSolicitud(proyecto, id, tipo) {
  if (!ID_VALIDO.test(id)) throw new Error('publicacionId inválido.');
  if (!TIPOS.includes(tipo)) throw new Error(`tipo debe ser ${TIPOS.join(' o ')}.`);
  return {
    update: { name: documento(proyecto, id), fields: campos({ estado: 'solicitada', tipo }) },
    currentDocument: { exists: false },
    updateTransforms: [{ fieldPath: 'solicitadaEn', setToServerValue: 'REQUEST_TIME' }],
  };
}

/**
 * Deja un texto apto para mostrarlo en el admin: sin colores de terminal, sin
 * nada que parezca un token o una llave, en una línea y corto.
 */
export function mensajeLegible(texto, max = MENSAJE_MAX) {
  const limpio = String(texto)
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/-----BEGIN [\s\S]*?-----END [A-Z ]+-----/g, '[oculto]')
    .replace(/ya29\.[\w.-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+|AIza[\w-]{30,}/g, '[oculto]')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(limpio);
  return chars.length <= max ? limpio : chars.slice(0, max - 1).join('').trimEnd() + '…';
}

/**
 * Mensaje de error final: motivo + resumen del build, y al final el enlace a la
 * ejecución en GitHub. Si hay que cortar, se corta el texto, nunca el enlace.
 */
export function mensajeDeError(motivo, resumen = '', enlace = '') {
  const sufijo = enlace ? ` Detalle: ${enlace}` : '';
  const texto = mensajeLegible([motivo || 'El despliegue falló.', resumen].filter(Boolean).join(' '), MENSAJE_MAX - sufijo.length);
  return texto + sufijo;
}

/**
 * Busca en el log del build el motivo que le sirve a quien edita el contenido:
 * el bloque inválido con sus primeros campos, los bloques que faltan, etc.
 * Devuelve '' si no encuentra nada reconocible.
 */
export function resumirBuild(log) {
  const lineas = String(log).replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/);
  const patron = /(Contenido inválido en .*|Faltan bloques en Firestore.*|CONTENT_SOURCE=.*no es válido.*|No se pudo leer el contenido.*|No existe el archivo de la cuenta de servicio.*)/;

  for (let i = 0; i < lineas.length; i++) {
    const encontrado = lineas[i].match(patron);
    if (!encontrado) continue;
    const campos = [];
    for (let j = i + 1; j < lineas.length && campos.length < 3 && /^\s*•/.test(lineas[j]); j++) {
      campos.push(lineas[j].trim());
    }
    return [encontrado[1], ...campos].join(' ');
  }
  return '';
}
