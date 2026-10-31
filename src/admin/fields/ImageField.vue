<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { cdn } from '../../lib/cdn';
import type { Imagen } from '../../lib/schemas';
import { confirmar } from '../confirmar';
import { useCampo } from '../formulario';
import { textos } from '../textos';
import TextField from './TextField.vue';

// Imagen de R2 { src, alt, width, height }. Por ahora muestra la ruta y la vista
// previa con cdn(); la subida llega en T21. Quitar solo borra la referencia.
const props = defineProps<{ ruta: string; etiqueta: string; ayuda?: string }>();

const t = textos.campos.imagen;
const { id, valor, error, limites, errorDe } = useCampo(() => props.ruta);
const imagen = computed(() => (valor.value && typeof valor.value === 'object' ? (valor.value as Imagen) : undefined));
const errorImagen = computed(() => error.value ?? errorDe('src') ?? errorDe('width') ?? errorDe('height'));

const falloVistaPrevia = ref(false);
watch(
  () => imagen.value?.src,
  () => (falloVistaPrevia.value = false),
);

async function quitar() {
  const pedido = textos.confirmar.quitarImagen;
  if (await confirmar(pedido)) valor.value = undefined;
}
</script>

<template>
  <fieldset :id="id" class="imagen" tabindex="-1" :data-invalido="errorImagen ? 'true' : undefined">
    <legend>
      {{ etiqueta }}
      <span v-if="limites.opcional" class="opcional">({{ textos.campos.opcional }})</span>
    </legend>
    <p v-if="ayuda" class="ayuda">{{ ayuda }}</p>

    <template v-if="imagen">
      <div class="vista">
        <img
          v-if="!falloVistaPrevia"
          :src="cdn(imagen.src)"
          :alt="imagen.alt"
          :width="imagen.width"
          :height="imagen.height"
          loading="lazy"
          @error="falloVistaPrevia = true"
        />
        <div v-else class="ph sin-vista">{{ t.sinVistaPrevia }}</div>
      </div>
      <dl class="datos">
        <div>
          <dt>{{ t.ruta }}</dt>
          <dd><code>{{ imagen.src }}</code></dd>
        </div>
        <div>
          <dt>{{ t.tamano }}</dt>
          <dd>{{ t.pixeles(imagen.width, imagen.height) }}</dd>
        </div>
      </dl>
      <TextField :ruta="`${ruta}.alt`" :etiqueta="t.alt" :ayuda="t.altAyuda" />
      <button type="button" class="btn btn-borde quitar" @click="quitar">{{ t.quitar }}</button>
    </template>
    <template v-else>
      <div class="ph sin-vista">{{ t.sinImagen }}</div>
      <p class="ayuda">{{ t.subidaPronto }}</p>
    </template>

    <p v-if="errorImagen" class="error">{{ errorImagen }}</p>
  </fieldset>
</template>

<style scoped>
.imagen {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.imagen:focus {
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

.ayuda {
  font-size: var(--text-sm);
  color: var(--muted);
}

.vista img {
  display: block;
  max-width: 100%;
  max-height: 260px;
  width: auto;
  height: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.sin-vista {
  display: grid;
  place-items: center;
  max-width: 420px;
  aspect-ratio: 1200 / 630;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--faint);
}

.datos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin: 0;
}

dt {
  font-size: var(--text-xs);
  color: var(--faint);
}

dd {
  margin: 0;
  color: var(--text-soft);
  overflow-wrap: anywhere;
}

code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.quitar {
  align-self: flex-start;
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}
</style>
