<script setup lang="ts">
import { computed } from 'vue';

import type { Limites } from '../campos';
import { describirPor } from '../formulario';
import { textos } from '../textos';

// Lo común a los campos de texto: etiqueta, "opcional", ayuda, contador y error.
// El control va en el slot, que recibe el aria-describedby armado.
const props = defineProps<{
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  limites: Limites;
  /** Largo actual, para el contador (si el schema tiene máximo o hay un largo recomendado). */
  largo?: number;
  /** Largo recomendado: el contador lo avisa al pasarlo, pero no impide guardar. */
  recomendado?: number;
}>();

const t = textos.campos;
const conContador = computed(
  () => props.largo !== undefined && (props.limites.max !== undefined || props.recomendado !== undefined),
);
const sobreRecomendado = computed(() => props.recomendado !== undefined && props.largo! > props.recomendado);
const excedido = computed(() => props.limites.max !== undefined && props.largo! > props.limites.max);
const contador = computed(() =>
  props.recomendado !== undefined
    ? { visible: t.contadorRecomendado(props.largo!, props.recomendado, props.limites.max), lector: t.contadorRecomendadoLector(props.largo!, props.recomendado, props.limites.max) }
    : { visible: t.contador(props.largo!, props.limites.max!), lector: t.contadorLector(props.largo!, props.limites.max!) },
);
const describedby = computed(() =>
  describirPor(props.id, { ayuda: props.ayuda, contador: conContador.value, error: props.error }),
);
</script>

<template>
  <div class="campo">
    <div class="encabezado">
      <label :for="id">
        {{ etiqueta }}
        <span v-if="limites.opcional" class="opcional">({{ textos.campos.opcional }})</span>
      </label>
      <span
        v-if="conContador"
        :id="`${id}-contador`"
        class="contador"
        :class="{ 'sobre-recomendado': sobreRecomendado, excedido }"
      >
        <span aria-hidden="true">{{ contador.visible }}</span>
        <span class="sr-only">{{ contador.lector }}</span>
        <template v-if="sobreRecomendado && !excedido"> · {{ t.sobreRecomendado }}</template>
      </span>
    </div>
    <p v-if="ayuda" :id="`${id}-ayuda`" class="ayuda">{{ ayuda }}</p>
    <slot :describedby="describedby" />
    <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.encabezado {
  display: flex;
  flex-wrap: wrap; /* en pantallas angostas el contador baja a su propia línea */
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
}

label {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.opcional {
  color: var(--faint);
}

.contador {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--faint);
  white-space: nowrap;
}

/* Pasar el recomendado solo avisa; pasar el máximo además muestra el error del schema. */
.contador.sobre-recomendado {
  color: var(--gold-light);
}

.contador.excedido {
  color: var(--gold);
  font-weight: 600;
}

.ayuda {
  font-size: var(--text-sm);
  color: var(--muted);
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}

/* Campo con error: borde dorado. */
.campo :slotted([aria-invalid='true']) {
  border-color: var(--gold);
}
</style>
