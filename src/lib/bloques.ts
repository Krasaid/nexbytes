/**
 * Bloques de contenido del CMS: cada uno es un documento en Firestore
 * (`borradores/{bloque}` y `publicado/{bloque}`) con la misma forma que su
 * JSON en src/content/data/, más `version` y `actualizadoEn`.
 *
 * firestore.rules repite esta lista de nombres: si agregas un bloque, agrégalo
 * también allá.
 */
import type { z } from 'zod';

import {
  cotizadorSchema,
  heroSchema,
  nosotrosSchema,
  procesoSchema,
  productoSchema,
  proyectosSchema,
  serviciosSchema,
  siteSchema,
} from './schemas';

export const BLOQUES = {
  site: siteSchema,
  hero: heroSchema,
  servicios: serviciosSchema,
  proyectos: proyectosSchema,
  proceso: procesoSchema,
  producto: productoSchema,
  cotizador: cotizadorSchema,
  nosotros: nosotrosSchema,
} as const satisfies Record<string, z.ZodType>;

export type Bloque = keyof typeof BLOQUES;

export const NOMBRES_BLOQUES = Object.keys(BLOQUES) as Bloque[];

/** Une los errores de zod en líneas legibles: `  • campo.sub: mensaje`. */
export function describirErrores(issues: z.ZodError['issues']): string {
  return issues
    .map((issue) => `  • ${issue.path.length ? issue.path.join('.') : '(raíz)'}: ${issue.message}`)
    .join('\n');
}
