<script setup lang="ts">
import { ICONOS } from '../../lib/iconos';
import type { IconName } from '../../lib/schemas';

// El mismo dibujo que Icon.astro en la landing (src/lib/iconos.ts). Decorativo.
withDefaults(defineProps<{ nombre: IconName; tamano?: number }>(), { tamano: 24 });
</script>

<template>
  <!-- v-html: trazos fijos de src/lib/iconos.ts, nunca contenido del usuario. -->
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="ICONOS[nombre]"
  ></svg>
</template>
