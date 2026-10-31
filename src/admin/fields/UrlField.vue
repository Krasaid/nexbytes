<script setup lang="ts">
import { computed } from 'vue';

import { useCampo } from '../formulario';
import { textos } from '../textos';
import CampoBase from './CampoBase.vue';

// Acepta URLs completas y destinos internos (/#servicios); el schema decide qué
// es válido. Las URLs completas se pueden abrir para comprobarlas.
const props = defineProps<{
  ruta: string;
  etiqueta: string;
  ayuda?: string;
}>();

const { id, valor, error, limites, tocar } = useCampo(() => props.ruta);
const texto = computed({
  get: () => (typeof valor.value === 'string' ? valor.value : ''),
  set: (v: string) => (valor.value = v),
});
const absoluta = computed(() => /^https?:\/\/[^\s]+$/.test(texto.value.trim()));
</script>

<template>
  <CampoBase v-slot="{ describedby }" :id="id" :etiqueta="etiqueta" :ayuda="ayuda" :error="error" :limites="limites" :largo="texto.length">
    <div class="fila">
      <input
        :id="id"
        v-model="texto"
        type="text"
        inputmode="url"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedby"
        @blur="tocar"
      />
      <a v-if="absoluta" class="abrir" :href="texto.trim()" target="_blank" rel="noopener noreferrer">
        {{ textos.campos.abrirEnlace }}<span class="sr-only"> ({{ textos.campos.abrirEnlaceLector }})</span>
      </a>
    </div>
  </CampoBase>
</template>

<style scoped>
.fila {
  display: flex;
  gap: var(--space-2);
}

.fila input {
  flex: 1;
  min-width: 0;
}

.abrir {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  font-size: var(--text-label);
}
</style>
