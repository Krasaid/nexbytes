<script setup lang="ts">
import { useCampo } from '../formulario';

// Aviso que acompaña a un interruptor `visible` cuando está apagado. Va en su
// propio componente porque necesita estar dentro del formulario del editor.
const props = defineProps<{ ruta: string; texto: string }>();
const { valor } = useCampo(() => props.ruta);
</script>

<template>
  <p v-if="valor === false" class="aviso" role="status">{{ texto }}</p>
</template>
