<script setup lang="ts">
import ListField from '../fields/ListField.vue';
import TextField from '../fields/TextField.vue';
import { textos } from '../textos';
import EditorBloque from './EditorBloque.vue';
import HeaderFields from './HeaderFields.vue';
import PlantillaWhatsapp from './PlantillaWhatsapp.vue';
import Seccion from './Seccion.vue';

// Las opciones de cada paso tienen el máximo de firestore.rules (schema): su
// contador aparece solo. Los 5 pasos no se agregan, quitan ni reordenan.
const t = textos.bloquesEditor.cotizador;
const listasSimples = [
  ['funciones', t.funciones, t.funcion],
  ['plazos', t.plazos, t.plazo],
  ['presupuestos', t.presupuestos, t.presupuesto],
] as const;
const grupos = [
  ['botones', t.botones, t.boton],
  ['errores', t.errores, t.error],
  ['exito', t.exito, t.exitoCampo],
  ['resumen', t.resumen, t.resumenCampo],
] as const;
</script>

<template>
  <EditorBloque nombre="cotizador">
    <HeaderFields />

    <Seccion id="pasos" :titulo="t.pasos">
      <ListField
        v-slot="{ ruta }"
        ruta="pasos"
        :etiqueta="t.pasos"
        :elemento="t.paso"
        :ayuda="t.pasosAyuda"
        :reordenable="false"
        :nuevo="() => ({ nombre: '', titulo: '' })"
      >
        <TextField :ruta="`${ruta}.nombre`" :etiqueta="t.pasoNombre" />
        <TextField :ruta="`${ruta}.titulo`" :etiqueta="t.pasoTitulo" />
        <TextField class="ancho" :ruta="`${ruta}.ayuda`" :etiqueta="t.pasoAyuda" />
      </ListField>
    </Seccion>

    <Seccion id="opciones" :titulo="t.opciones">
      <p class="ancho nota">{{ t.opcionesAyuda }}</p>
      <ListField v-slot="{ ruta }" ruta="tipos" :etiqueta="t.tipos" :elemento="t.tipo" :nuevo="() => ({ label: '', hint: '' })">
        <TextField :ruta="`${ruta}.label`" :etiqueta="t.tipoLabel" />
        <TextField :ruta="`${ruta}.hint`" :etiqueta="t.tipoHint" />
      </ListField>
      <ListField
        v-for="[lista, etiqueta, elemento] in listasSimples"
        :key="lista"
        v-slot="{ ruta, indice }"
        :ruta="lista"
        :etiqueta="etiqueta"
        :elemento="elemento"
        :nuevo="() => ''"
      >
        <TextField class="ancho" :ruta="ruta" :etiqueta="textos.numerado(elemento, indice + 1)" />
      </ListField>
    </Seccion>

    <Seccion id="whatsapp" :titulo="t.whatsapp">
      <PlantillaWhatsapp />
    </Seccion>

    <Seccion id="campos" :titulo="t.campos">
      <fieldset v-for="(nombre, campo) in t.campo" :key="campo" class="grupo">
        <legend>{{ nombre }}</legend>
        <div class="grupo-campos">
          <TextField :ruta="`campos.${campo}.label`" :etiqueta="t.campoLabel" />
          <TextField :ruta="`campos.${campo}.placeholder`" :etiqueta="t.campoPlaceholder" />
        </div>
      </fieldset>
      <TextField class="ancho" ruta="progreso" :etiqueta="t.progreso" :ayuda="t.progresoAyuda" />
    </Seccion>

    <Seccion v-for="[grupo, titulo, etiquetas] in grupos" :id="grupo" :key="grupo" :titulo="titulo">
      <TextField
        v-for="(etiqueta, campo) in etiquetas"
        :key="campo"
        :class="{ ancho: campo === 'texto' || campo === 'envio' }"
        :ruta="`${grupo}.${campo}`"
        :etiqueta="etiqueta"
      />
    </Seccion>
  </EditorBloque>
</template>

<style scoped>
.nota {
  font-size: var(--text-sm);
  color: var(--muted);
}

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
