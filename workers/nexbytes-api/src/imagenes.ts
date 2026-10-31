/**
 * Reglas de las imágenes en R2: tipo real (por los primeros bytes, nunca por el
 * Content-Type del navegador), tamaño, prefijos permitidos y nombre del archivo.
 */
export const MAX_BYTES = 2 * 1024 * 1024;

export const PREFIJOS = ['proyectos', 'nosotros', 'seo', 'general'] as const;
export type Prefijo = (typeof PREFIJOS)[number];

export const TIPOS = {
  webp: 'image/webp',
  avif: 'image/avif',
} as const;
export type Extension = keyof typeof TIPOS;

const texto = (bytes: Uint8Array, desde: number, hasta: number) =>
  String.fromCharCode(...bytes.subarray(desde, hasta));

/**
 * webp: `RIFF....WEBP`. avif: caja `ftyp` al inicio con marca `avif` o `avis`
 * (la principal o una de las compatibles). Cualquier otra cosa: null.
 */
export function detectarTipo(bytes: Uint8Array): Extension | null {
  if (bytes.length >= 12 && texto(bytes, 0, 4) === 'RIFF' && texto(bytes, 8, 12) === 'WEBP') return 'webp';

  if (bytes.length >= 16 && texto(bytes, 4, 8) === 'ftyp') {
    const tamanoCaja = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    const fin = Math.min(tamanoCaja, bytes.length);
    // Marca principal (8-12) y, después de la versión (12-16), las compatibles de 4 en 4.
    const marcas = [texto(bytes, 8, 12)];
    for (let i = 16; i + 4 <= fin; i += 4) marcas.push(texto(bytes, i, i + 4));
    if (marcas.some((m) => m === 'avif' || m === 'avis')) return 'avif';
  }
  return null;
}

export function esPrefijo(valor: unknown): valor is Prefijo {
  return typeof valor === 'string' && (PREFIJOS as readonly string[]).includes(valor);
}

/** Slug para el nombre del archivo (el que manda el admin, o "imagen"). */
export function slugValido(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return 'imagen';
  if (typeof valor !== 'string' || valor.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(valor)) return null;
  return valor;
}

/** `<prefijo>/<slug>-<hash corto>.<ext>`: el hash del contenido lo hace único. */
export async function claveDe(prefijo: Prefijo, slug: string, bytes: Uint8Array, extension: Extension): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest.subarray(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefijo}/${slug}-${hash}.${extension}`;
}

/** Solo rutas que pudo crear /upload: un prefijo permitido, sin subcarpetas ni "..". */
export function rutaBorrable(ruta: unknown): ruta is string {
  return (
    typeof ruta === 'string' &&
    new RegExp(`^(${PREFIJOS.join('|')})/[a-z0-9]+(-[a-z0-9]+)*\\.(webp|avif)$`).test(ruta)
  );
}
