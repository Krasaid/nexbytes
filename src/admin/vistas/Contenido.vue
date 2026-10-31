<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useRoute } from 'vue-router';

import type { Bloque } from '../../lib/bloques';
import EditorHero from '../editores/EditorHero.vue';
import EditorSitio from '../editores/EditorSitio.vue';
import Pendiente from './Pendiente.vue';

// Editor de cada bloque; los que faltan llegan en T19.
const editores: Partial<Record<Bloque, Component>> = {
  site: EditorSitio,
  hero: EditorHero,
};

const ruta = useRoute();
const bloque = computed(() => ruta.params.bloque as Bloque);
</script>

<template>
  <!-- La key reinicia el editor al cambiar de bloque. -->
  <component :is="editores[bloque] ?? Pendiente" :key="bloque" />
</template>
