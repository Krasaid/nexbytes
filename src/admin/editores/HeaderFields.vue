<script setup lang="ts">
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import Seccion from './Seccion.vue';

// El encabezado de una sección de la landing (headerSchema): eyebrow, título y descripción.
defineProps<{ ruta?: string }>();
const t = textos.bloquesEditor.header;
</script>

<template>
  <Seccion id="header" :titulo="t.titulo">
    <TextField class="ancho" :ruta="`${ruta ?? 'header'}.eyebrow`" :etiqueta="t.eyebrow" />
    <TextField class="ancho" :ruta="`${ruta ?? 'header'}.titulo`" :etiqueta="t.tituloCampo" />
    <TextArea class="ancho" :ruta="`${ruta ?? 'header'}.descripcion`" :etiqueta="t.descripcion" :filas="2" />
  </Seccion>
</template>
