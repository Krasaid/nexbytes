<script setup lang="ts">
import ImageField from '../fields/ImageField.vue';
import LinkField from '../fields/LinkField.vue';
import TagsField from '../fields/TagsField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import Seccion from './Seccion.vue';

const t = textos.bloquesEditor.nosotros;
</script>

<template>
  <EditorBloque nombre="nosotros">
    <Seccion id="textos" :titulo="t.textos">
      <TextField class="ancho" ruta="eyebrow" :etiqueta="t.eyebrow" />
      <TextField class="ancho" ruta="titulo" :etiqueta="t.titulo" />
      <TextArea class="ancho" ruta="texto" :etiqueta="t.texto" :filas="4" />
      <TagsField ruta="tecnologias" :etiqueta="t.tecnologias" :elemento="t.tecnologia" />
      <LinkField ruta="portafolio" :leyenda="t.portafolio" />
    </Seccion>
    <Seccion id="foto" :titulo="t.foto">
      <!-- ImageField trae el texto alternativo junto a la foto. -->
      <ImageField ruta="foto" :etiqueta="t.foto" prefijo="nosotros" nombre="foto" />
      <TextField class="ancho" ruta="sinFoto" :etiqueta="t.sinFoto" />
    </Seccion>
  </EditorBloque>
</template>
