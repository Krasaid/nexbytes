<script setup lang="ts">
import { toRaw } from 'vue';

import ListField from '../fields/ListField.vue';
import TextField from '../fields/TextField.vue';
import ToggleField from '../fields/ToggleField.vue';
import { numerarProyectos, ordenarProyectos } from '../proyectos';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import HeaderFields from './HeaderFields.vue';
import ProyectoItem from './ProyectoItem.vue';
import Seccion from './Seccion.vue';

// El orden se maneja solo con subir y bajar: `orden` se recalcula al guardar.
const t = textos.bloquesEditor.proyectos;

// Proyectos que ya están en el borrador, con el slug con el que se guardaron.
// useBloque pasa por alCargar al cargar y después de cada guardado, así un
// proyecto nuevo deja de serlo en cuanto se guarda. Los proyectos no tienen id:
// se reconocen por el objeto, que se conserva al editarlos y moverlos.
const slugsGuardados = new WeakMap<object, string>();
function alCargar(contenido: Record<string, unknown>) {
  const ordenado = ordenarProyectos(contenido);
  for (const item of (ordenado.items as { slug: string }[] | undefined) ?? []) slugsGuardados.set(item, item.slug);
  return ordenado;
}
const slugGuardado = (item: unknown) => slugsGuardados.get(toRaw(item as object));
const nuevo = () => ({ slug: '', titulo: '', etiqueta: '', resumen: '', stack: [], orden: 0, visible: false });
</script>

<template>
  <EditorBloque nombre="proyectos" :ajustes="{ alCargar, alGuardar: numerarProyectos }">
    <HeaderFields />
    <Seccion id="textos" :titulo="t.textos">
      <TextField ruta="textos.sinImagen" :etiqueta="t.sinImagen" />
      <TextField ruta="textos.verSitio" :etiqueta="t.verSitio" />
    </Seccion>
    <Seccion id="items" :titulo="t.items">
      <ListField ruta="items" :etiqueta="t.items" :elemento="t.item" :ayuda="t.itemsAyuda" :nuevo="nuevo">
        <template #cabecera="{ ruta, item }">
          <span class="titulo-item" :class="{ oculto: !(item as { visible?: boolean }).visible }">
            {{ (item as { titulo?: string }).titulo || t.sinTitulo }}
          </span>
          <ToggleField class="visible" :ruta="`${ruta}.visible`" :etiqueta="t.visible" />
        </template>
        <template #default="{ ruta, indice, item }">
          <ProyectoItem :ruta="ruta" :indice="indice" :slug-guardado="slugGuardado(item)" />
        </template>
      </ListField>
    </Seccion>
  </EditorBloque>
</template>

<style scoped>
.titulo-item {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--text);
}

.titulo-item.oculto {
  color: var(--muted);
}

.visible {
  flex-shrink: 0;
}
</style>
