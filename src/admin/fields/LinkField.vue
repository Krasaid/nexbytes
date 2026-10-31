<script setup lang="ts">
import { textos } from '../textos';
import TextField from './TextField.vue';
import UrlField from './UrlField.vue';

// Un enlace { label, href } del contenido (menú, botones, pie). Con `leyenda` se
// agrupa con su título; dentro de una lista ya lo agrupa el elemento.
defineProps<{ ruta: string; leyenda?: string }>();
const t = textos.editores.enlace;
</script>

<template>
  <fieldset v-if="leyenda" class="enlace">
    <legend>{{ leyenda }}</legend>
    <div class="campos">
      <TextField :ruta="`${ruta}.label`" :etiqueta="t.texto" />
      <UrlField :ruta="`${ruta}.href`" :etiqueta="t.destino" :ayuda="t.destinoAyuda" />
    </div>
  </fieldset>
  <template v-else>
    <TextField :ruta="`${ruta}.label`" :etiqueta="t.texto" />
    <UrlField :ruta="`${ruta}.href`" :etiqueta="t.destino" :ayuda="t.destinoAyuda" />
  </template>
</template>

<style scoped>
.enlace {
  min-width: 0;
  margin: 0;
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

legend {
  padding: 0 var(--space-2);
  font-size: var(--text-label);
  color: var(--text-soft);
}

.campos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--space-3);
}
</style>
