/**
 * Lógica pura de los formularios del admin (sin Vue ni Firebase), probada en
 * tests/unit/admin-campos.test.ts.
 *
 * Los campos se identifican por su ruta dentro del bloque: `seo.titulo`,
 * `nav.0.label`. De la ruta salen el valor, el schema (largos, si es opcional)
 * y el error de zod que le corresponde.
 */
import type { z } from 'zod';

import { textos } from './textos';

type Ruta = string;

const partes = (ruta: Ruta): string[] => (ruta ? ruta.split('.') : []);

/** Valor en `ruta` (undefined si no existe). */
export function leer(objeto: unknown, ruta: Ruta): unknown {
  let actual: unknown = objeto;
  for (const parte of partes(ruta)) {
    if (actual === null || typeof actual !== 'object') return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return actual;
}

/**
 * Escribe `valor` en `ruta`, creando los objetos intermedios que falten.
 * `undefined` borra la propiedad (así un opcional vacío desaparece del documento).
 */
export function escribir(objeto: Record<string, unknown>, ruta: Ruta, valor: unknown): void {
  const lista = partes(ruta);
  const ultima = lista.pop();
  if (ultima === undefined) return;
  let actual: Record<string, unknown> = objeto;
  for (const parte of lista) {
    if (actual[parte] === null || typeof actual[parte] !== 'object') actual[parte] = {};
    actual = actual[parte] as Record<string, unknown>;
  }
  if (valor === undefined && !Array.isArray(actual)) delete actual[ultima];
  else actual[ultima] = valor;
}

interface DefZod {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  in?: z.ZodType;
  checks?: { _zod: { def: { check: string; minimum?: number; maximum?: number; length?: number } } }[];
}

const def = (schema: z.ZodType): DefZod => (schema as unknown as { _zod: { def: DefZod } })._zod.def;

/** Envolturas que no cambian la forma del dato. */
const ENVOLTURAS = ['optional', 'nullable', 'default', 'prefault', 'nonoptional', 'readonly', 'catch'];

function desenvolver(schema: z.ZodType): { schema: z.ZodType; opcional: boolean } {
  let actual = schema;
  let opcional = false;
  for (;;) {
    const d = def(actual);
    if (d.type === 'optional') opcional = true;
    if (ENVOLTURAS.includes(d.type) && d.innerType) actual = d.innerType;
    else if (d.type === 'pipe' && d.in) actual = d.in;
    else return { schema: actual, opcional };
  }
}

/** Schema del campo en `ruta`, o undefined si la ruta no existe en el schema. */
export function esquemaEn(schema: z.ZodType, ruta: Ruta): z.ZodType | undefined {
  let actual: z.ZodType | undefined = schema;
  for (const parte of partes(ruta)) {
    if (!actual) return undefined;
    const interno = desenvolver(actual).schema;
    const d = def(interno);
    if (d.type === 'object') actual = d.shape?.[parte];
    else if (d.type === 'array' && /^\d+$/.test(parte)) actual = d.element;
    else return undefined;
  }
  return actual;
}

export interface Limites {
  /** El campo puede quedar vacío (se guarda sin la propiedad). */
  opcional: boolean;
  /** Mínimo de caracteres (texto) o de elementos (lista). */
  min?: number;
  /** Máximo de caracteres (texto) o de elementos (lista). */
  max?: number;
}

/** Lo que el schema permite en `ruta`: si es opcional y sus largos mínimo y máximo. */
export function limitesDe(schema: z.ZodType, ruta: Ruta): Limites {
  const campo = esquemaEn(schema, ruta);
  if (!campo) return { opcional: false };
  const { schema: interno, opcional } = desenvolver(campo);
  const d = def(interno);

  if (d.type === 'string') {
    const s = interno as unknown as { minLength: number | null; maxLength: number | null };
    return { opcional, min: s.minLength ?? undefined, max: s.maxLength ?? undefined };
  }
  if (d.type === 'array') {
    const limites: Limites = { opcional };
    for (const check of d.checks ?? []) {
      const c = check._zod.def;
      if (c.check === 'min_length') limites.min = c.minimum;
      if (c.check === 'max_length') limites.max = c.maximum;
      if (c.check === 'length_equals') limites.min = limites.max = c.length;
    }
    return limites;
  }
  return { opcional };
}

type Issue = z.ZodError['issues'][number];

/**
 * Mensaje para el admin: los casos comunes en lenguaje claro, el resto con el
 * texto de zod en español. `valor` es lo que hay en el campo (para distinguir
 * "falta" de "tiene otro tipo").
 */
export function mensajeDeIssue(issue: Issue, valor?: unknown): string {
  const e = textos.errores;
  const i = issue as Issue & { origin?: string; minimum?: number | bigint; maximum?: number | bigint; format?: string; exact?: boolean };
  if (i.code === 'too_small' && i.origin === 'string') {
    return Number(i.minimum) <= 1 ? e.obligatorio : e.minCaracteres(Number(i.minimum));
  }
  if (i.code === 'too_big' && i.origin === 'string') return e.maxCaracteres(Number(i.maximum));
  if ((i.code === 'too_small' || i.code === 'too_big') && i.origin === 'array') {
    if (i.exact) return e.exactoElementos(Number(i.minimum ?? i.maximum));
    return i.code === 'too_small' ? e.minElementos(Number(i.minimum)) : e.maxElementos(Number(i.maximum));
  }
  if (i.code === 'invalid_format' && i.format === 'url') return e.url;
  if (i.code === 'invalid_type' && valor === undefined) return e.obligatorio;
  return issue.message;
}

/** Primer mensaje de error de cada ruta (`nav.0.label` → mensaje). */
export function erroresPorRuta(issues: Issue[], datos: unknown): Map<Ruta, string> {
  const errores = new Map<Ruta, string>();
  for (const issue of issues) {
    const ruta = issue.path.join('.');
    if (!errores.has(ruta)) errores.set(ruta, mensajeDeIssue(issue, leer(datos, ruta)));
  }
  return errores;
}

/** id del elemento de un campo, estable y válido en HTML. */
export function idDe(ruta: Ruta): string {
  return `campo-${ruta.replace(/[^\w-]/g, '-')}`;
}
