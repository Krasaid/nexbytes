<script setup lang="ts" generic="T">
import { computed, nextTick, ref } from 'vue';

import { confirmar } from '../confirmar';
import { describirPor, useCampo } from '../formulario';
import { textos } from '../textos';

// Lista de strings u objetos. Cada elemento se pinta con el slot, que recibe su
// `ruta` (`nav.2`). Agregar, quitar (con confirmación) y subir/bajar respetan los
// mínimos y máximos del schema (por ejemplo, exactamente 3 chips).
const props = withDefaults(defineProps<{
  ruta: string;
  etiqueta: string;
  /** Nombre de un elemento, en minúscula: "enlace" → "Agregar enlace", "enlace 2". */
  elemento: string;
  /** Valor de un elemento nuevo. */
  nuevo: () => T;
  ayuda?: string;
  /** false: el orden tiene significado (por ejemplo, los pasos fijos del cotizador). */
  reordenable?: boolean;
}>(), { reordenable: true, ayuda: undefined });

defineSlots<{
  default(props: { ruta: string; indice: number; item: T }): unknown;
  /** Extra en la cabecera de cada elemento (título, interruptor…). */
  cabecera?(props: { ruta: string; indice: number; item: T }): unknown;
}>();

const t = textos.campos.lista;
const { id, valor, error, limites, tocar } = useCampo(() => props.ruta);
const items = computed<T[]>(() => (Array.isArray(valor.value) ? (valor.value as T[]) : []));
const puedeAgregar = computed(() => limites.value.max === undefined || items.value.length < limites.value.max);
const puedeQuitar = computed(() => items.value.length > (limites.value.min ?? 0));
const nombre = (i: number) => `${props.elemento} ${i + 1}`;
const describedby = computed(() => describirPor(id.value, { ayuda: props.ayuda, error: error.value }));

const lista = ref<HTMLElement | null>(null);
/** Primer campo del contenido de un elemento (no los controles de su cabecera). */
const PRIMER_CAMPO = '.contenido :is(input, textarea, select)';
const botonAgregar = ref<HTMLButtonElement | null>(null);
const elementoEn = (i: number) => lista.value?.querySelectorAll<HTMLElement>(':scope > li')[i];

function enfocar(el: Element | null | undefined) {
  (el as HTMLElement | null | undefined)?.focus();
}

async function mover(i: number, paso: -1 | 1) {
  const destino = i + paso;
  const copia = [...items.value];
  [copia[i], copia[destino]] = [copia[destino], copia[i]];
  valor.value = copia;
  tocar();
  // El foco sigue al elemento movido; si llegó a un extremo, al otro botón.
  await nextTick();
  const li = elementoEn(destino);
  const mismo = li?.querySelector<HTMLButtonElement>(`[data-accion="${paso < 0 ? 'subir' : 'bajar'}"]`);
  enfocar(mismo && !mismo.disabled ? mismo : li?.querySelector(`[data-accion="${paso < 0 ? 'bajar' : 'subir'}"]`));
}

async function quitar(i: number) {
  const pedido = textos.confirmar.quitar;
  const aceptado = await confirmar({ titulo: pedido.titulo(nombre(i)), texto: pedido.texto, accion: pedido.accion });
  if (!aceptado) return;
  const copia = [...items.value];
  copia.splice(i, 1);
  valor.value = copia;
  tocar();
  // El foco pasa al elemento que quedó en su lugar, al anterior o a "Agregar".
  await nextTick();
  const siguiente = elementoEn(Math.min(i, copia.length - 1));
  enfocar(siguiente?.querySelector(PRIMER_CAMPO) ?? botonAgregar.value ?? lista.value);
}

async function agregar() {
  valor.value = [...items.value, props.nuevo()];
  await nextTick();
  enfocar(elementoEn(items.value.length - 1)?.querySelector(PRIMER_CAMPO));
}
</script>

<template>
  <fieldset
    :id="id"
    class="lista"
    tabindex="-1"
    :data-invalido="error ? 'true' : undefined"
    :aria-describedby="describedby"
  >
    <legend>
      {{ etiqueta }}
      <span v-if="limites.opcional" class="opcional">({{ textos.campos.opcional }})</span>
    </legend>
    <p v-if="ayuda" :id="`${id}-ayuda`" class="ayuda">{{ ayuda }}</p>

    <ol v-if="items.length" ref="lista" class="elementos">
      <li v-for="(item, i) in items" :key="i" class="elemento">
        <div class="cabecera">
          <span class="nombre">{{ nombre(i) }}</span>
          <div v-if="$slots.cabecera" class="extra">
            <slot name="cabecera" :ruta="`${ruta}.${i}`" :indice="i" :item="item" />
          </div>
          <div class="acciones">
            <button
              v-if="reordenable"
              type="button"
              class="icono"
              data-accion="subir"
              :disabled="i === 0"
              :aria-label="t.subir(nombre(i))"
              @click="mover(i, -1)"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
            <button
              v-if="reordenable"
              type="button"
              class="icono"
              data-accion="bajar"
              :disabled="i === items.length - 1"
              :aria-label="t.bajar(nombre(i))"
              @click="mover(i, 1)"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </button>
            <button
              v-if="puedeQuitar"
              type="button"
              class="icono"
              data-accion="quitar"
              :aria-label="t.quitar(nombre(i))"
              @click="quitar(i)"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
        <div class="contenido">
          <slot :ruta="`${ruta}.${i}`" :indice="i" :item="item" />
        </div>
      </li>
    </ol>
    <p v-else class="vacia">{{ t.vacia }}</p>

    <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>

    <button v-if="puedeAgregar" ref="botonAgregar" type="button" class="btn btn-borde agregar" @click="agregar">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      {{ t.agregar(elemento) }}
    </button>
  </fieldset>
</template>

<style scoped>
.lista {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.lista:focus {
  outline: none;
}

legend {
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--text-label);
  color: var(--text-soft);
}

.opcional {
  color: var(--faint);
}

.ayuda,
.vacia {
  font-size: var(--text-sm);
  color: var(--muted);
}

.elementos {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.elemento {
  padding: var(--space-3) var(--space-4) var(--space-4);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.extra {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.nombre {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--faint);
}

.acciones {
  display: flex;
  gap: var(--space-1);
}

.icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  cursor: pointer;
}

.icono:hover:not(:disabled) {
  border-color: var(--line-strong);
  color: var(--text);
}

.icono:disabled {
  color: var(--line-strong);
  cursor: default;
}

.contenido {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--space-3);
}

/* Textos largos, grupos, etiquetas e imágenes ocupan toda la fila. */
.contenido > :deep(.ancho),
.contenido > :deep(fieldset) {
  grid-column: 1 / -1;
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}

.lista[data-invalido='true'] .elementos,
.lista[data-invalido='true'] .vacia {
  outline: 1px solid var(--gold);
  outline-offset: var(--space-1);
  border-radius: var(--radius-md);
}

.agregar {
  align-self: flex-start;
}

/* En pantallas angostas, lo extra de la cabecera (título, interruptor) baja a su propia línea. */
@media (max-width: 767px) {
  .cabecera {
    flex-wrap: wrap;
  }

  .extra {
    order: 3;
    flex-basis: 100%;
    justify-content: space-between;
  }
}
</style>
