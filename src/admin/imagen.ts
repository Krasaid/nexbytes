/**
 * Preparación de imágenes en el navegador antes de subirlas al Worker.
 *
 * - Se leen con createImageBitmap(file, { imageOrientation: 'from-image' }):
 *   respeta la orientación EXIF de las fotos del celular.
 * - Se redibujan en un canvas y se exportan a WebP. **Al pasar por el canvas se
 *   pierden todos los metadatos EXIF, incluida la ubicación GPS de las fotos.
 *   Es intencional**: nada de eso debe llegar al sitio público.
 * - Lado mayor de 1600 px sin agrandar las pequeñas; la imagen para compartir
 *   (OG) va exactamente a 1200×630 con recorte centrado.
 * - WebP con calidad 0.82; si pasa de 2 MB se reintenta con menos calidad.
 *
 * Las funciones de cálculo son puras (tests/unit/admin-imagen.test.ts); las
 * que usan canvas solo corren en el navegador (tests/e2e).
 */

export const LADO_MAXIMO = 1600;
export const TAMANO_OG = { ancho: 1200, alto: 630 } as const;
/** El mismo límite que el Worker (workers/nexbytes-api/src/imagenes.ts). */
export const MAX_BYTES = 2 * 1024 * 1024;
/** Calidades WebP que se prueban en orden hasta quedar bajo MAX_BYTES. */
export const CALIDADES = [0.82, 0.72, 0.62, 0.52, 0.42] as const;

export type Modo = 'normal' | 'og';

export interface Medidas {
  ancho: number;
  alto: number;
}

/** Medidas finales con el lado mayor en `ladoMax`, sin agrandar imágenes más pequeñas. */
export function tamanoDestino(ancho: number, alto: number, ladoMax = LADO_MAXIMO): Medidas {
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

export interface Recorte {
  /** Rectángulo de la imagen original que se usa (sx, sy, ancho, alto). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Rectángulo centrado más grande de la original con la proporción de `destino` (1200×630 → 1.905). */
export function recorteCentrado(ancho: number, alto: number, destino: Medidas = TAMANO_OG): Recorte {
  const proporcion = destino.ancho / destino.alto;
  if (ancho / alto > proporcion) {
    // Más ancha que el destino: se recortan los costados.
    const sw = Math.round(alto * proporcion);
    return { sx: Math.round((ancho - sw) / 2), sy: 0, sw, sh: alto };
  }
  // Más alta (o igual): se recorta arriba y abajo.
  const sh = Math.round(ancho / proporcion);
  return { sx: 0, sy: Math.round((alto - sh) / 2), sw: ancho, sh };
}

export type MotivoError = 'ilegible' | 'pesada' | 'sinWebp';

export class ErrorImagen extends Error {
  constructor(readonly motivo: MotivoError) {
    super(motivo);
  }
}

/** Codifica con la primera calidad que quede bajo `max`; si ninguna, ErrorImagen('pesada'). */
export async function codificarConLimite(
  codificar: (calidad: number) => Promise<Blob>,
  max = MAX_BYTES,
  calidades: readonly number[] = CALIDADES,
): Promise<{ blob: Blob; calidad: number }> {
  for (const calidad of calidades) {
    const blob = await codificar(calidad);
    if (blob.size <= max) return { blob, calidad };
  }
  throw new ErrorImagen('pesada');
}

export interface ImagenProcesada extends Medidas {
  blob: Blob;
  calidad: number;
}

/** Lee, orienta, redimensiona (o recorta para OG) y convierte a WebP. Solo navegador. */
export async function procesarImagen(archivo: Blob, modo: Modo): Promise<ImagenProcesada> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    // Por ejemplo, HEIC de iPhone en Chrome: el navegador no sabe decodificarlo.
    throw new ErrorImagen('ilegible');
  }

  try {
    const origen = modo === 'og' ? recorteCentrado(bitmap.width, bitmap.height) : { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };
    const destino = modo === 'og' ? TAMANO_OG : tamanoDestino(bitmap.width, bitmap.height);

    const canvas = document.createElement('canvas');
    canvas.width = destino.ancho;
    canvas.height = destino.alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ErrorImagen('ilegible');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, origen.sx, origen.sy, origen.sw, origen.sh, 0, 0, destino.ancho, destino.alto);

    const { blob, calidad } = await codificarConLimite(
      (q) =>
        new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new ErrorImagen('ilegible'))), 'image/webp', q),
        ),
    );
    // Un navegador sin codificador WebP devuelve PNG en silencio.
    if (blob.type !== 'image/webp') throw new ErrorImagen('sinWebp');
    return { blob, calidad, ...destino };
  } finally {
    bitmap.close();
  }
}

/**
 * Cuántas veces aparece la imagen `ruta` ({ src: ruta }) en los contenidos dados
 * (bloques completos, a cualquier profundidad).
 */
export function usosDeRuta(contenidos: unknown[], ruta: string): number {
  let usos = 0;
  const recorrer = (valor: unknown) => {
    if (Array.isArray(valor)) valor.forEach(recorrer);
    else if (valor && typeof valor === 'object') {
      if ((valor as { src?: unknown }).src === ruta) usos++;
      Object.values(valor).forEach(recorrer);
    }
  };
  contenidos.forEach(recorrer);
  return usos;
}

/** "1,2 MB" / "380 KB". */
export function pesoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('es-SV', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-SV')} KB`;
}
