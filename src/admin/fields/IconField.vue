<script setup lang="ts">
import { computed } from 'vue';

import { iconNames, type IconName } from '../../lib/schemas';
import { describirPor, useCampo } from '../formulario';
import { textos } from '../textos';
import IconoSvg from './IconoSvg.vue';

// Selector de ícono con la vista previa de cada uno. Son radios reales:
// Tab entra al grupo y las flechas cambian la elección.
const props = defineProps<{ ruta: string; etiqueta: string; ayuda?: string }>();

const { id, valor, error, tocar } = useCampo(() => props.ruta);
const seleccion = computed({
  get: () => valor.value as IconName | undefined,
  set: (v: IconName | undefined) => {
    valor.value = v;
    tocar();
  },
});
const describedby = computed(() => describirPor(id.value, { ayuda: props.ayuda, error: error.value }));
</script>

<template>
  <fieldset
    :id="id"
    class="iconos"
    tabindex="-1"
    :data-invalido="error ? 'true' : undefined"
    :aria-describedby="describedby"
  >
    <legend>{{ etiqueta }}</legend>
    <p v-if="ayuda" :id="`${id}-ayuda`" class="ayuda">{{ ayuda }}</p>
    <div class="opciones">
      <label v-for="nombre in iconNames" :key="nombre" class="opcion" :class="{ elegido: seleccion === nombre }">
        <input v-model="seleccion" class="radio" type="radio" :name="id" :value="nombre" />
        <IconoSvg :nombre="nombre" :tamano="26" />
        <span class="nombre">{{ textos.iconos[nombre] ?? nombre }}</span>
      </label>
    </div>
    <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
  </fieldset>
</template>

<style scoped>
.iconos {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.iconos:focus {
  outline: none;
}

legend {
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--text-label);
  color: var(--text-soft);
}

.ayuda {
  font-size: var(--text-sm);
  color: var(--muted);
}

.opciones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: var(--space-2);
}

.opcion {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-height: 84px;
  padding: var(--space-3) var(--space-2);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--text-soft);
  cursor: pointer;
}

.opcion:hover {
  border-color: var(--gold);
}

.opcion.elegido {
  background: var(--gold-tint);
  border-color: var(--gold);
  color: var(--gold-light);
}

/* El radio sigue siendo el control (teclado y lector), pero no se dibuja. */
.radio {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}

.opcion:has(.radio:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.nombre {
  font-size: var(--text-xs);
  text-align: center;
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}
</style>
