<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useRoute } from 'vue-router';

import type { Bloque } from '../../lib/bloques';
import EditorCotizador from '../editores/EditorCotizador.vue';
import EditorHero from '../editores/EditorHero.vue';
import EditorNosotros from '../editores/EditorNosotros.vue';
import EditorProceso from '../editores/EditorProceso.vue';
import EditorProducto from '../editores/EditorProducto.vue';
import EditorProyectos from '../editores/EditorProyectos.vue';
import EditorServicios from '../editores/EditorServicios.vue';
import EditorSitio from '../editores/EditorSitio.vue';

// El editor de cada bloque (la ruta ya validó que el bloque existe).
const editores: Record<Bloque, Component> = {
  site: EditorSitio,
  hero: EditorHero,
  servicios: EditorServicios,
  proyectos: EditorProyectos,
  proceso: EditorProceso,
  producto: EditorProducto,
  cotizador: EditorCotizador,
  nosotros: EditorNosotros,
};

const ruta = useRoute();
const bloque = computed(() => ruta.params.bloque as Bloque);
</script>

<template>
  <!-- La key reinicia el editor al cambiar de bloque. -->
  <component :is="editores[bloque]" :key="bloque" />
</template>
