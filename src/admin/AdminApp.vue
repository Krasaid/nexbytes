<script setup lang="ts">
import { watch } from 'vue';

import { detenerCambios, iniciarCambios } from './cambios';
import Login from './Login.vue';
import { detenerNuevas, iniciarNuevas } from './nuevas';
import { useSesion } from './sesion';
import Shell from './Shell.vue';
import { textos } from './textos';

const { estado } = useSesion();

// Las escuchas de Firestore solo viven mientras hay sesión de admin.
watch(
  () => estado.fase,
  (fase) => {
    if (fase === 'dentro') {
      iniciarCambios();
      iniciarNuevas();
    } else {
      detenerCambios();
      detenerNuevas();
    }
  },
  { immediate: true },
);
</script>

<template>
  <p v-if="estado.fase === 'cargando'" class="cargando" role="status">{{ textos.cargando }}</p>
  <Login v-else-if="estado.fase === 'fuera'" />
  <Shell v-else />
</template>

<style scoped>
.cargando {
  display: grid;
  place-items: center;
  min-height: 100vh;
  color: var(--muted);
}
</style>
