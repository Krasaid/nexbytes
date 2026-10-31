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

/** Lo que devuelve el schema de un bloque (Site, Hero, …). */
export type ContenidoDe<B extends Bloque> = z.output<(typeof BLOQUES)[B]>;

/**
 * Valida un bloque con su schema. Si falla, lanza un error que dice de dónde
 * vino el dato (`origen`: un archivo o un documento de Firestore) y cada campo mal.
 */
export function validarBloque<B extends Bloque>(nombre: B, data: unknown, origen: string): ContenidoDe<B> {
  const result = BLOQUES[nombre].safeParse(data);
  if (result.success) return result.data as ContenidoDe<B>;
  throw new Error(`Contenido inválido en ${origen}\n${describirErrores(result.error.issues)}`);
}

/** Une los errores de zod en líneas legibles: `  • campo.sub: mensaje`. */
export function describirErrores(issues: z.ZodError['issues']): string {
  return issues
    .map((issue) => `  • ${issue.path.length ? issue.path.join('.') : '(raíz)'}: ${issue.message}`)
    .join('\n');
}
