<script setup lang="ts">
import ImageField from '../fields/ImageField.vue';
import LinkField from '../fields/LinkField.vue';
import ListField from '../fields/ListField.vue';
import SelectField from '../fields/SelectField.vue';
import TextArea from '../fields/TextArea.vue';
import TextField from '../fields/TextField.vue';
import UrlField from '../fields/UrlField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import Seccion from './Seccion.vue';

const t = textos.editores.site;
const enlaceNuevo = () => ({ label: '', href: '' });
</script>

<template>
  <EditorBloque nombre="site">
    <Seccion id="general" :titulo="t.general">
      <TextField ruta="nombre" :etiqueta="t.nombre" />
      <TextField ruta="ciudad" :etiqueta="t.ciudad" />
      <TextArea class="ancho" ruta="tagline" :etiqueta="t.tagline" :filas="2" />
      <TextField ruta="correo" :etiqueta="t.correo" tipo="email" />
      <TextField ruta="whatsapp" :etiqueta="t.whatsapp" :ayuda="t.whatsappAyuda" tipo="tel" />
    </Seccion>

    <Seccion id="menu" :titulo="t.menu">
      <ListField v-slot="{ ruta }" ruta="nav" :etiqueta="t.nav" :elemento="t.enlace" :nuevo="enlaceNuevo">
        <LinkField :ruta="ruta" />
      </ListField>
      <LinkField ruta="ctaMenu" :leyenda="t.ctaMenu" />
    </Seccion>

    <Seccion id="redes" :titulo="t.redes">
      <ListField v-slot="{ ruta }" ruta="redes" :etiqueta="t.redes" :elemento="t.red" :nuevo="() => ({ nombre: '', url: '' })">
        <TextField :ruta="`${ruta}.nombre`" :etiqueta="t.redNombre" />
        <UrlField :ruta="`${ruta}.url`" :etiqueta="t.redUrl" />
      </ListField>
    </Seccion>

    <Seccion id="seo" :titulo="t.seo">
      <TextField class="ancho" ruta="seo.titulo" :etiqueta="t.seoTitulo" :ayuda="t.seoTituloAyuda" />
      <TextArea class="ancho" ruta="seo.descripcion" :etiqueta="t.seoDescripcion" :ayuda="t.seoDescripcionAyuda" />
      <ImageField ruta="seo.imagenOg" :etiqueta="t.imagenOg" :ayuda="t.imagenOgAyuda" />
      <fieldset class="grupo">
        <legend>{{ t.ubicacion }}</legend>
        <div class="grupo-campos">
          <TextField ruta="seo.ubicacion.localidad" :etiqueta="t.localidad" />
          <TextField ruta="seo.ubicacion.region" :etiqueta="t.region" />
          <SelectField ruta="seo.ubicacion.pais" :etiqueta="t.pais" :opciones="textos.paises" />
        </div>
      </fieldset>
      <ListField v-slot="{ ruta, indice }" ruta="seo.areaServida" :etiqueta="t.areaServida" :elemento="t.zona" :nuevo="() => ''">
        <TextField :ruta="ruta" :etiqueta="`${t.zona} ${indice + 1}`" />
      </ListField>
    </Seccion>

    <Seccion id="footer" :titulo="t.footer">
      <TextField ruta="footer.tituloContacto" :etiqueta="t.tituloContacto" />
      <TextField ruta="footer.tituloExplorar" :etiqueta="t.tituloExplorar" />
      <ListField v-slot="{ ruta }" ruta="footer.explorar" :etiqueta="t.explorar" :elemento="t.enlace" :nuevo="enlaceNuevo">
        <LinkField :ruta="ruta" />
      </ListField>
      <TextField ruta="footer.derechos" :etiqueta="t.derechos" />
      <TextField ruta="footer.codigo" :etiqueta="t.codigo" />
    </Seccion>

    <Seccion id="no-encontrada" :titulo="t.noEncontrada">
      <TextField ruta="noEncontrada.codigo" :etiqueta="t.noEncontradaCodigo" />
      <TextField ruta="noEncontrada.titulo" :etiqueta="t.noEncontradaTitulo" />
      <TextArea class="ancho" ruta="noEncontrada.texto" :etiqueta="t.noEncontradaTexto" />
      <LinkField ruta="noEncontrada.boton" :leyenda="t.noEncontradaBoton" />
    </Seccion>
  </EditorBloque>
</template>

<style scoped>
.grupo {
  min-width: 0;
  margin: 0;
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

legend {
  padding: 0 var(--space-2);
  font-size: var(--text-label);
  color: var(--text-soft);
}

.grupo-campos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: var(--space-3);
}
</style>
