<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { textos } from '../textos';

// Marcador de las secciones que llegan en tareas siguientes.
const ruta = useRoute();
const titulo = computed(() => ruta.meta.titulo(ruta));
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ titulo }}</h1>
  <p class="texto">{{ textos.pendiente.texto(ruta.meta.tarea ?? '') }}</p>
</template>

<style scoped>
.texto {
  color: var(--muted);
}
</style>
