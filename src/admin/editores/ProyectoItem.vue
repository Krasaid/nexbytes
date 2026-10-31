<script setup lang="ts">
import { watch } from 'vue';

import ImageField from '../fields/ImageField.vue';
import TagsField from '../fields/TagsField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import UrlField from '../fields/UrlField.vue';
import { useCampo } from '../formulario';
import { esSlugAutomatico, slugDe, slugUnico } from '../slug';
import { textos } from '../textos';

// Campos de un proyecto de la lista (`items.N`). El slug sigue al título
// mientras no se haya editado a mano, y nunca repite el de otro proyecto.
const props = defineProps<{ ruta: string; indice: number }>();

const t = textos.bloquesEditor.proyectos;
const titulo = useCampo(() => `${props.ruta}.titulo`);
const slug = useCampo(() => `${props.ruta}.slug`);
const items = useCampo('items');

function slugsDeOtros(): string[] {
  const lista = Array.isArray(items.valor.value) ? (items.valor.value as { slug?: string }[]) : [];
  return lista.filter((_, i) => i !== props.indice).map((p) => p.slug ?? '');
}

// Se mira la ruta junto al título: al reordenar, esta tarjeta pasa a mostrar
// otro proyecto y eso no es "cambiar el título".
watch(
  () => [props.ruta, (titulo.valor.value as string | undefined) ?? ''] as const,
  ([ruta, nuevo], [rutaAntes, antes]) => {
    if (ruta !== rutaAntes || nuevo === antes) return;
    const actual = (slug.valor.value as string | undefined) ?? '';
    if (esSlugAutomatico(actual, antes)) slug.valor.value = slugUnico(slugDe(nuevo), slugsDeOtros());
  },
);
</script>

<template>
  <TextField :ruta="`${ruta}.titulo`" :etiqueta="t.titulo" />
  <TextField :ruta="`${ruta}.slug`" :etiqueta="t.slug" :ayuda="t.slugAyuda" />
  <TextField :ruta="`${ruta}.etiqueta`" :etiqueta="t.etiqueta" />
  <UrlField :ruta="`${ruta}.url`" :etiqueta="t.url" />
  <TextArea class="ancho" :ruta="`${ruta}.resumen`" :etiqueta="t.resumen" />
  <TagsField :ruta="`${ruta}.stack`" :etiqueta="t.stack" :elemento="t.stackElemento" />
  <ImageField :ruta="`${ruta}.imagen`" :etiqueta="t.imagen" />
</template>
