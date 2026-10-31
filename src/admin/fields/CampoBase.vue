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
  /** Largo actual, para el contador (solo si el schema tiene máximo). */
  largo?: number;
}>();

const conContador = computed(() => props.limites.max !== undefined && props.largo !== undefined);
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
        :class="{ excedido: largo! > limites.max! }"
      >
        <span aria-hidden="true">{{ textos.campos.contador(largo!, limites.max!) }}</span>
        <span class="sr-only">{{ textos.campos.contadorLector(largo!, limites.max!) }}</span>
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
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
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

.contador.excedido {
  color: var(--gold-light);
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
