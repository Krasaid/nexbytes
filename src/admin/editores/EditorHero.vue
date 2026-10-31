<script setup lang="ts">
import LinkField from '../fields/LinkField.vue';
import ListField from '../fields/ListField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import Seccion from './Seccion.vue';

const t = textos.editores.hero;
</script>

<template>
  <EditorBloque nombre="hero">
    <Seccion id="textos" :titulo="t.textos">
      <TextField class="ancho" ruta="eyebrow" :etiqueta="t.eyebrow" />
      <TextArea class="ancho" ruta="titulo" :etiqueta="t.titulo" :filas="2" />
      <TextArea class="ancho" ruta="subtitulo" :etiqueta="t.subtitulo" />
    </Seccion>

    <Seccion id="botones" :titulo="t.botones">
      <LinkField ruta="ctaPrimario" :leyenda="t.ctaPrimario" />
      <LinkField ruta="ctaSecundario" :leyenda="t.ctaSecundario" />
    </Seccion>

    <Seccion id="tarjeta" :titulo="t.tarjeta">
      <TextField ruta="tarjeta.marca" :etiqueta="t.marca" />
      <TextField ruta="tarjeta.subtitulo" :etiqueta="t.tarjetaSubtitulo" />
      <TextField ruta="tarjeta.codigo" :etiqueta="t.codigo" />
      <TextField ruta="tarjeta.ubicacion" :etiqueta="t.ubicacion" />
    </Seccion>

    <Seccion id="chips" :titulo="t.chips">
      <!-- El schema exige exactamente 3: sin agregar ni quitar, solo editar y reordenar. -->
      <ListField v-slot="{ ruta }" ruta="chips" :etiqueta="t.chips" :elemento="t.chip" :nuevo="() => ({ numero: '', label: '' })">
        <TextField :ruta="`${ruta}.numero`" :etiqueta="t.numero" />
        <TextField :ruta="`${ruta}.label`" :etiqueta="t.chipTexto" />
      </ListField>
    </Seccion>
  </EditorBloque>
</template>
