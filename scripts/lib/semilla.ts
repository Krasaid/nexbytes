/**
 * Lógica pura de `npm run seed` (sin Firestore ni disco), para probarla con
 * Vitest: tests/unit/semilla.test.ts.
 */
import { BLOQUES, NOMBRES_BLOQUES, describirErrores, type Bloque } from '../../src/lib/bloques';

export type Contenido = Record<string, unknown>;

export type ResultadoValidacion =
  | { ok: true; bloques: Record<Bloque, Contenido> }
  | { ok: false; errores: string[] };

/**
 * Valida el JSON de cada bloque con su schema. Devuelve los datos tal como los
 * deja zod (sin campos desconocidos y con los valores por defecto aplicados),
 * que es lo que se sube a Firestore.
 * `undefined` en un bloque significa que su archivo no existe.
 */
export function validarBloques(datos: Partial<Record<Bloque, unknown>>): ResultadoValidacion {
  const errores: string[] = [];
  const bloques: Partial<Record<Bloque, Contenido>> = {};

  for (const nombre of NOMBRES_BLOQUES) {
    const archivo = `src/content/data/${nombre}.json`;
    if (datos[nombre] === undefined) {
      errores.push(`Falta ${archivo}`);
      continue;
    }
    const result = BLOQUES[nombre].safeParse(datos[nombre]);
    if (result.success) bloques[nombre] = result.data as Contenido;
    else errores.push(`Contenido inválido en ${archivo}\n${describirErrores(result.error.issues)}`);
  }

  return errores.length ? { ok: false, errores } : { ok: true, bloques: bloques as Record<Bloque, Contenido> };
}

/**
 * La version nunca retrocede: una más que la mayor que ya exista (en el
 * borrador o en lo publicado), o 1 si el bloque es nuevo. Así un admin con una
 * copia vieja abierta no puede pisar la semilla (las reglas exigen version + 1).
 */
export function siguienteVersion(...actuales: unknown[]): number {
  const enteros = actuales.filter((v): v is number => Number.isInteger(v) && (v as number) > 0);
  return Math.max(0, ...enteros) + 1;
}
