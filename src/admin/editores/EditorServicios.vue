<script setup lang="ts">
import IconField from '../fields/IconField.vue';
import ListField from '../fields/ListField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import HeaderFields from './HeaderFields.vue';
import Seccion from './Seccion.vue';

const t = textos.bloquesEditor.servicios;
</script>

<template>
  <EditorBloque nombre="servicios">
    <HeaderFields />
    <Seccion id="items" :titulo="t.items">
      <ListField
        v-slot="{ ruta }"
        ruta="items"
        :etiqueta="t.items"
        :elemento="t.item"
        :nuevo="() => ({ icono: 'web', titulo: '', descripcion: '' })"
      >
        <IconField :ruta="`${ruta}.icono`" :etiqueta="t.icono" />
        <TextField class="ancho" :ruta="`${ruta}.titulo`" :etiqueta="t.titulo" />
        <TextArea class="ancho" :ruta="`${ruta}.descripcion`" :etiqueta="t.descripcion" />
      </ListField>
    </Seccion>
  </EditorBloque>
</template>
