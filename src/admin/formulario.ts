/**
 * Estado de un formulario del admin y su conexión con los campos (sin Firebase:
 * eso está en bloque.ts). Los campos de src/admin/fields/ reciben solo su
 * `ruta`; con useCampo() leen y escriben el valor, y obtienen su error y lo que
 * el schema permite.
 *
 * Un error se muestra cuando el campo ya se tocó (al salir de él) o después de
 * intentar guardar, para no marcar en rojo lo que todavía no se ha escrito.
 */
import {
  computed,
  inject,
  provide,
  reactive,
  ref,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type { z } from 'zod';

import { erroresPorRuta, escribir, esquemaEn, idDe, leer, limitesDe, type Limites } from './campos';

export interface Formulario {
  schema: z.ZodType;
  /** Bloque que se edita (borradores/{bloque}). */
  bloque?: string;
  datos: Ref<Record<string, unknown>>;
  /** Todos los errores actuales, por ruta (se muestren o no). */
  errores: ComputedRef<Map<string, string>>;
  /** Ya se intentó guardar: se muestran todos los errores. */
  intentado: Ref<boolean>;
  tocados: Set<string>;
  leer(ruta: string): unknown;
  escribir(ruta: string, valor: unknown): void;
  /** Error de la ruta, solo si ya debe verse. */
  error(ruta: string): string | undefined;
  tocar(ruta: string): void;
}

const CLAVE: InjectionKey<Formulario> = Symbol('formulario');

export function crearFormulario(schema: z.ZodType, datos: Ref<Record<string, unknown>>, bloque?: string): Formulario {
  const intentado = ref(false);
  const tocados = reactive(new Set<string>());
  const validacion = computed(() => schema.safeParse(datos.value));
  const errores = computed(() =>
    validacion.value.success ? new Map<string, string>() : erroresPorRuta(validacion.value.error.issues, datos.value),
  );

  return {
    schema,
    bloque,
    datos,
    errores,
    intentado,
    tocados,
    leer: (ruta) => leer(datos.value, ruta),
    escribir: (ruta, valor) => {
      // Un opcional vacío se guarda sin la propiedad, no como "" (que no pasaría el schema).
      const vacio = valor === '' && limitesDe(schema, ruta).opcional;
      escribir(datos.value, ruta, vacio ? undefined : valor);
    },
    error: (ruta) => (intentado.value || tocados.has(ruta) ? errores.value.get(ruta) : undefined),
    tocar: (ruta) => {
      tocados.add(ruta);
    },
  };
}

export function proveerFormulario(formulario: Formulario): void {
  provide(CLAVE, formulario);
}

/** Lo que necesita un campo para pintarse a partir de su ruta. */
export function useCampo(ruta: MaybeRefOrGetter<string>) {
  const formulario = inject(CLAVE);
  if (!formulario) throw new Error('useCampo() necesita un formulario (proveerFormulario).');
  const r = computed(() => toValue(ruta));

  if (import.meta.env.DEV && !esquemaEn(formulario.schema, r.value)) {
    console.warn(`[admin] La ruta "${r.value}" no existe en el schema del bloque.`);
  }

  return {
    id: computed(() => idDe(r.value)),
    valor: computed({
      get: () => formulario.leer(r.value),
      set: (valor: unknown) => formulario.escribir(r.value, valor),
    }),
    error: computed(() => formulario.error(r.value)),
    limites: computed<Limites>(() => limitesDe(formulario.schema, r.value)),
    tocar: () => formulario.tocar(r.value),
    /** Error de una ruta hija (por ejemplo `imagenOg.src`), para campos compuestos. */
    errorDe: (hija: string) => formulario.error(`${r.value}.${hija}`),
    /** Bloque que se edita y su contenido actual (con lo no guardado). */
    bloque: formulario.bloque,
    datos: formulario.datos,
  };
}

/** ids para aria-describedby: ayuda, contador, aviso y error, solo los que existen. */
export function describirPor(
  id: string,
  partes: { ayuda?: unknown; contador?: unknown; aviso?: unknown; error?: unknown },
): string | undefined {
  const ids = [
    partes.ayuda ? `${id}-ayuda` : '',
    partes.contador ? `${id}-contador` : '',
    partes.aviso ? `${id}-aviso` : '',
    partes.error ? `${id}-error` : '',
  ].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}
