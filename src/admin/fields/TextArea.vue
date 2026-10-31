<script setup lang="ts">
import { computed } from 'vue';

import { useCampo } from '../formulario';
import CampoBase from './CampoBase.vue';

const props = defineProps<{
  ruta: string;
  etiqueta: string;
  ayuda?: string;
  /** Largo recomendado (aparte del máximo del schema): el contador cambia de color al pasarlo. */
  recomendado?: number;
  filas?: number;
}>();

const { id, valor, error, limites, tocar } = useCampo(() => props.ruta);
const texto = computed({
  get: () => (typeof valor.value === 'string' ? valor.value : ''),
  set: (v: string) => (valor.value = v),
});
</script>

<template>
  <CampoBase v-slot="{ describedby }" :id="id" :etiqueta="etiqueta" :ayuda="ayuda" :error="error" :limites="limites" :largo="texto.length" :recomendado="recomendado">
    <textarea
      :id="id"
      v-model="texto"
      :rows="filas ?? 3"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedby"
      @blur="tocar"
    ></textarea>
  </CampoBase>
</template>

<style scoped>
textarea {
  line-height: 1.5;
}
</style>
