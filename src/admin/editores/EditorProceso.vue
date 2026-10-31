<script setup lang="ts">
import ListField from '../fields/ListField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import HeaderFields from './HeaderFields.vue';
import Seccion from './Seccion.vue';

const t = textos.bloquesEditor.proceso;
</script>

<template>
  <EditorBloque nombre="proceso">
    <HeaderFields />
    <Seccion id="pasos" :titulo="t.pasos">
      <ListField
        v-slot="{ ruta }"
        ruta="pasos"
        :etiqueta="t.pasos"
        :elemento="t.paso"
        :nuevo="() => ({ titulo: '', descripcion: '' })"
      >
        <TextField class="ancho" :ruta="`${ruta}.titulo`" :etiqueta="t.titulo" />
        <TextArea class="ancho" :ruta="`${ruta}.descripcion`" :etiqueta="t.descripcion" :filas="2" />
      </ListField>
    </Seccion>
  </EditorBloque>
</template>
