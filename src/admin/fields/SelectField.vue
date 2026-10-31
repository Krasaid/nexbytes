<script setup lang="ts">
import { computed } from 'vue';

import { useCampo } from '../formulario';
import CampoBase from './CampoBase.vue';

export interface Opcion {
  valor: string;
  etiqueta: string;
}

const props = defineProps<{
  ruta: string;
  etiqueta: string;
  ayuda?: string;
  opciones: readonly Opcion[];
}>();

const { id, valor, error, limites, tocar } = useCampo(() => props.ruta);
const seleccion = computed({
  get: () => (typeof valor.value === 'string' ? valor.value : ''),
  set: (v: string) => (valor.value = v),
});
// Si el valor guardado no está en la lista, se muestra igual para no perderlo.
const todas = computed<Opcion[]>(() =>
  seleccion.value && !props.opciones.some((o) => o.valor === seleccion.value)
    ? [...props.opciones, { valor: seleccion.value, etiqueta: seleccion.value }]
    : [...props.opciones],
);
</script>

<template>
  <CampoBase v-slot="{ describedby }" :id="id" :etiqueta="etiqueta" :ayuda="ayuda" :error="error" :limites="limites">
    <select
      :id="id"
      v-model="seleccion"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedby"
      @blur="tocar"
    >
      <option v-if="!seleccion" value="" disabled></option>
      <option v-for="opcion in todas" :key="opcion.valor" :value="opcion.valor">{{ opcion.etiqueta }}</option>
    </select>
  </CampoBase>
</template>

<style scoped>
select {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--text-base);
}
</style>
