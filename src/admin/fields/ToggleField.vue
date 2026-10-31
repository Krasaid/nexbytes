<script setup lang="ts">
import { computed } from 'vue';

import { describirPor, useCampo } from '../formulario';

// Interruptor sí/no: un checkbox real con role="switch" (teclado: Espacio).
const props = defineProps<{
  ruta: string;
  etiqueta: string;
  ayuda?: string;
  /** Resaltado (por ejemplo, la visibilidad de una sección completa). */
  destacado?: boolean;
}>();

const { id, valor, error, tocar } = useCampo(() => props.ruta);
const activo = computed({
  get: () => valor.value === true,
  set: (v: boolean) => {
    valor.value = v;
    tocar();
  },
});
const describedby = computed(() => describirPor(id.value, { ayuda: props.ayuda, error: error.value }));
</script>

<template>
  <div class="interruptor" :class="{ destacado }">
    <input
      :id="id"
      v-model="activo"
      type="checkbox"
      role="switch"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedby"
    />
    <div class="textos">
      <label :for="id">{{ etiqueta }}</label>
      <p v-if="ayuda" :id="`${id}-ayuda`" class="ayuda">{{ ayuda }}</p>
      <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.interruptor {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.interruptor.destacado {
  padding: var(--space-4);
  background: var(--gold-tint);
  border: 1px solid var(--gold);
  border-radius: var(--radius-md);
}

/* El checkbox se dibuja como interruptor; sigue siendo el control real. */
input {
  appearance: none;
  flex-shrink: 0;
  position: relative;
  width: 48px;
  min-height: 28px;
  height: 28px;
  margin: 8px 0;
  padding: 0;
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background var(--transition-fast);
}

input::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: var(--muted);
  border-radius: var(--radius-full);
  transition: transform var(--transition-fast);
}

input:checked {
  background: var(--gold);
  border-color: var(--gold);
}

input:checked::after {
  background: var(--on-gold);
  transform: translateX(20px);
}

.textos {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

/* La etiqueta también activa el interruptor: con ella el objetivo llega a 44 px. */
label {
  display: flex;
  align-items: center;
  min-height: var(--tap-min);
  color: var(--text);
  cursor: pointer;
}

.ayuda {
  font-size: var(--text-sm);
  color: var(--muted);
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}

@media (prefers-reduced-motion: reduce) {
  input,
  input::after {
    transition: none;
  }
}
</style>
