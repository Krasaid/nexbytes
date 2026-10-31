<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { describirPor, useCampo } from '../formulario';
import { textos } from '../textos';

// Lista de strings como etiquetas (stack, tecnologías): se agregan con Enter o
// con el botón y se quitan con su ×. Quitar una etiqueta no pide confirmación:
// es una palabra y se vuelve a escribir en un segundo.
const props = defineProps<{
  ruta: string;
  etiqueta: string;
  /** Nombre de una etiqueta, en minúscula: "tecnología" → "Agregar tecnología". */
  elemento: string;
  ayuda?: string;
}>();

const t = textos.etiquetas;
const { id, valor, error, limites, tocar, errorDe } = useCampo(() => props.ruta);
const items = computed<string[]>(() => (Array.isArray(valor.value) ? (valor.value as string[]) : []));
const llena = computed(() => limites.value.max !== undefined && items.value.length >= limites.value.max);
const errorLista = computed(() => error.value ?? items.value.map((_, i) => errorDe(String(i))).find(Boolean));
const describedby = computed(() => describirPor(id.value, { ayuda: props.ayuda, error: errorLista.value }));

const nueva = ref('');
const aviso = ref('');
const entrada = ref<HTMLInputElement | null>(null);
const lista = ref<HTMLElement | null>(null);

function agregar() {
  const texto = nueva.value.trim();
  aviso.value = '';
  if (!texto || llena.value) return;
  if (items.value.some((i) => i.toLocaleLowerCase() === texto.toLocaleLowerCase())) {
    aviso.value = t.repetida(texto);
    return;
  }
  valor.value = [...items.value, texto];
  nueva.value = '';
  tocar();
}

async function quitar(i: number) {
  const copia = [...items.value];
  copia.splice(i, 1);
  valor.value = copia;
  aviso.value = '';
  tocar();
  // El foco pasa a la etiqueta que quedó en su lugar, o al campo para agregar.
  await nextTick();
  const botones = lista.value?.querySelectorAll<HTMLButtonElement>('button');
  (botones?.[Math.min(i, copia.length - 1)] ?? entrada.value)?.focus();
}
</script>

<template>
  <fieldset
    :id="id"
    class="etiquetas"
    tabindex="-1"
    :data-invalido="errorLista ? 'true' : undefined"
    :aria-describedby="describedby"
  >
    <legend>
      {{ etiqueta }}
      <span v-if="limites.opcional" class="opcional">({{ textos.campos.opcional }})</span>
    </legend>
    <p v-if="ayuda" :id="`${id}-ayuda`" class="ayuda">{{ ayuda }}</p>

    <ul v-if="items.length" ref="lista" class="chips">
      <li v-for="(item, i) in items" :key="`${i}-${item}`" class="chip">
        <span>{{ item }}</span>
        <button type="button" class="quitar" :aria-label="t.quitar(item)" @click="quitar(i)">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </li>
    </ul>
    <p v-else class="vacia">{{ t.vacia }}</p>

    <div class="agregar">
      <label :for="`${id}-nueva`">{{ t.agregar(elemento) }}</label>
      <div class="fila">
        <input
          :id="`${id}-nueva`"
          ref="entrada"
          v-model="nueva"
          type="text"
          autocomplete="off"
          :disabled="llena"
          @keydown.enter.prevent="agregar"
        />
        <button type="button" class="btn btn-borde" :disabled="llena || !nueva.trim()" @click="agregar">
          {{ t.boton }}
        </button>
      </div>
    </div>

    <p v-if="llena" class="ayuda">{{ t.llena(limites.max!) }}</p>
    <p v-if="aviso" class="error" role="status">{{ aviso }}</p>
    <p v-if="errorLista" :id="`${id}-error`" class="error">{{ errorLista }}</p>
  </fieldset>
</template>

<style scoped>
.etiquetas {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.etiquetas:focus {
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

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding-left: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-soft);
}

.quitar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  background: transparent;
  border: 0;
  border-radius: var(--radius-full);
  color: var(--muted);
  cursor: pointer;
}

.quitar:hover {
  color: var(--text);
}

.agregar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.agregar label {
  font-size: var(--text-sm);
  color: var(--muted);
}

.fila {
  display: flex;
  gap: var(--space-2);
}

.fila input {
  flex: 1;
  min-width: 0;
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}
</style>
