<script setup lang="ts">
import ListField from '../fields/ListField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import ToggleField from '../fields/ToggleField.vue';
import { textos } from '../textos';
import AvisoOculta from './AvisoOculta.vue';
import EditorBloque from './EditorBloque.vue';
import Seccion from './Seccion.vue';

const t = textos.bloquesEditor.producto;
const lista = [
  ['titulo', t.listaTitulo],
  ['texto', t.listaTexto],
  ['label', t.listaLabel],
  ['placeholder', t.listaPlaceholder],
  ['boton', t.listaBoton],
  ['enviando', t.listaEnviando],
  ['error', t.listaError],
  ['errorEnvio', t.listaErrorEnvio],
  ['exitoTitulo', t.listaExitoTitulo],
  ['exitoTexto', t.listaExitoTexto],
] as const;
</script>

<template>
  <EditorBloque nombre="producto">
    <div class="visibilidad">
      <ToggleField ruta="visible" :etiqueta="t.visible" :ayuda="t.visibleAyuda" destacado />
      <AvisoOculta ruta="visible" :texto="t.oculta" />
    </div>

    <Seccion id="textos" :titulo="t.textos">
      <TextField ruta="eyebrow" :etiqueta="t.eyebrow" />
      <TextField ruta="nombre" :etiqueta="t.nombre" />
      <TextArea class="ancho" ruta="descripcion" :etiqueta="t.descripcion" />
      <ListField v-slot="{ ruta, indice }" ruta="beneficios" :etiqueta="t.beneficios" :elemento="t.beneficio" :nuevo="() => ''">
        <TextField class="ancho" :ruta="ruta" :etiqueta="textos.numerado(t.beneficio, indice + 1)" />
      </ListField>
    </Seccion>

    <Seccion id="lista-espera" :titulo="t.listaEspera">
      <TextField v-for="[campo, etiqueta] in lista" :key="campo" :ruta="`listaEspera.${campo}`" :etiqueta="etiqueta" />
    </Seccion>
  </EditorBloque>
</template>

<style scoped>
.visibilidad {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
