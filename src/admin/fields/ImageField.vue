<script setup lang="ts">
import { collection, getDocs } from 'firebase/firestore';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { cdn } from '../../lib/cdn';
import type { Imagen } from '../../lib/schemas';
import { borrarImagen, ErrorApi, subirImagen, type Prefijo } from '../api';
import { idDe } from '../campos';
import { confirmar } from '../confirmar';
import { getServicios } from '../firebase';
import { useCampo } from '../formulario';
import { ErrorImagen, pesoLegible, procesarImagen, usosDeRuta, type Modo } from '../imagen';
import { slugDe } from '../slug';
import { textos } from '../textos';
import TextField from './TextField.vue';

// Imagen de R2 { src, alt, width, height }:
// elegir o soltar → procesar en el navegador (src/admin/imagen.ts) → vista previa
// → subir al Worker con progreso → guardar la ruta. El alt es obligatorio.
// "Quitar" solo borra la referencia; "Borrar del almacenamiento" borra el archivo
// de R2, y solo si nada más del borrador (ni lo publicado) lo usa.
const props = withDefaults(
  defineProps<{
    ruta: string;
    etiqueta: string;
    ayuda?: string;
    /** Carpeta en R2 según el campo. */
    prefijo: Prefijo;
    /** og: recorte exacto a 1200×630. */
    modo?: Modo;
    /** Base del nombre del archivo (por ejemplo, el slug del proyecto). */
    nombre?: string;
  }>(),
  { ayuda: undefined, modo: 'normal', nombre: undefined },
);

const t = textos.campos.imagen;
const { id, valor, error, limites, errorDe, bloque, datos } = useCampo(() => props.ruta);
const imagen = computed(() => (valor.value && typeof valor.value === 'object' ? (valor.value as Imagen) : undefined));
const errorImagen = computed(() => error.value ?? errorDe('src') ?? errorDe('width') ?? errorDe('height'));

type Fase = 'reposo' | 'procesando' | 'lista' | 'subiendo' | 'borrando';
const fase = ref<Fase>('reposo');
const ocupado = computed(() => fase.value === 'procesando' || fase.value === 'subiendo' || fase.value === 'borrando');

interface Pendiente {
  blob: Blob;
  url: string;
  ancho: number;
  alto: number;
}
const pendiente = ref<Pendiente | null>(null);
const progreso = ref(0);
const pesoSubido = ref<number | null>(null);
const mensajeError = ref('');
const mensajeOk = ref('');
const arrastrando = ref(false);
const falloVistaPrevia = ref(false);
const entrada = ref<HTMLInputElement | null>(null);

watch(
  () => imagen.value?.src,
  () => (falloVistaPrevia.value = false),
);

function soltarPendiente() {
  if (pendiente.value) URL.revokeObjectURL(pendiente.value.url);
  pendiente.value = null;
}
onBeforeUnmount(soltarPendiente);

const MENSAJES: Record<ErrorImagen['motivo'], string> = {
  ilegible: t.errores.ilegible,
  pesada: t.errores.pesada,
  sinWebp: t.errores.sinWebp,
};

async function preparar(archivo: File | undefined) {
  if (!archivo || ocupado.value) return;
  mensajeError.value = '';
  mensajeOk.value = '';
  soltarPendiente();
  fase.value = 'procesando';
  try {
    const procesada = await procesarImagen(archivo, props.modo);
    pendiente.value = { blob: procesada.blob, url: URL.createObjectURL(procesada.blob), ancho: procesada.ancho, alto: procesada.alto };
    fase.value = 'lista';
  } catch (e) {
    mensajeError.value = e instanceof ErrorImagen ? MENSAJES[e.motivo] : t.errores.ilegible;
    fase.value = 'reposo';
  }
}

function alElegir(evento: Event) {
  const input = evento.target as HTMLInputElement;
  void preparar(input.files?.[0]);
  input.value = ''; // permite volver a elegir el mismo archivo
}

function alSoltar(evento: DragEvent) {
  arrastrando.value = false;
  void preparar(evento.dataTransfer?.files?.[0]);
}

const slug = computed(() => slugDe(props.nombre ?? '') || (props.modo === 'og' ? 'og' : 'imagen'));

async function subir() {
  const p = pendiente.value;
  if (!p || ocupado.value) return;
  fase.value = 'subiendo';
  progreso.value = 0;
  mensajeError.value = '';
  try {
    const path = await subirImagen(p.blob, { prefijo: props.prefijo, slug: slug.value }, (f) => (progreso.value = f));
    // Imagen nueva: el alt anterior no la describe, se pide uno nuevo.
    valor.value = { src: path, alt: '', width: p.ancho, height: p.alto };
    pesoSubido.value = p.blob.size;
    soltarPendiente();
    mensajeOk.value = t.subida;
    fase.value = 'reposo';
    await nextTick();
    document.getElementById(idDe(`${props.ruta}.alt`))?.focus();
  } catch (e) {
    mensajeError.value = e instanceof ErrorApi ? e.message : t.errores.red;
    fase.value = 'lista'; // la vista previa sigue ahí para reintentar
  }
}

async function quitar() {
  if (!(await confirmar(textos.confirmar.quitarImagen))) return;
  valor.value = undefined;
  pesoSubido.value = null;
  mensajeOk.value = '';
}

/** Usos de la imagen fuera de este campo: en los demás borradores y en lo publicado. */
async function usosFuera(src: string): Promise<{ borrador: number; publicado: number }> {
  const { db } = getServicios();
  const [borradores, publicado] = await Promise.all([
    getDocs(collection(db, 'borradores')),
    getDocs(collection(db, 'publicado')),
  ]);
  // De este bloque cuenta lo que está en el formulario (con lo no guardado), no lo guardado.
  const contenidos = borradores.docs.filter((d) => d.id !== bloque).map((d) => d.data() as unknown);
  contenidos.push(datos.value);
  return {
    borrador: usosDeRuta(contenidos, src) - 1, // menos este campo
    publicado: usosDeRuta(publicado.docs.map((d) => d.data() as unknown), src),
  };
}

async function borrarDelAlmacenamiento() {
  const src = imagen.value?.src;
  if (!src || ocupado.value) return;
  if (!(await confirmar(textos.confirmar.borrarImagen))) return;
  fase.value = 'borrando';
  mensajeError.value = '';
  mensajeOk.value = '';
  try {
    let usos;
    try {
      usos = await usosFuera(src);
    } catch {
      mensajeError.value = t.errores.usos;
      return;
    }
    if (usos.borrador > 0) mensajeError.value = t.enUso;
    else if (usos.publicado > 0) mensajeError.value = t.enUsoPublicado;
    else {
      await borrarImagen(src);
      valor.value = undefined;
      pesoSubido.value = null;
      mensajeOk.value = t.borrada;
    }
  } catch (e) {
    mensajeError.value = e instanceof ErrorApi ? e.message : t.errores.red;
  } finally {
    fase.value = 'reposo';
  }
}
</script>

<template>
  <fieldset
    :id="id"
    class="imagen"
    :class="{ arrastrando }"
    tabindex="-1"
    :data-invalido="errorImagen ? 'true' : undefined"
    @dragover.prevent
    @dragenter.prevent="arrastrando = !ocupado"
    @dragleave.self="arrastrando = false"
    @drop.prevent="alSoltar"
  >
    <legend>
      {{ etiqueta }}
      <span v-if="limites.opcional" class="opcional">({{ textos.campos.opcional }})</span>
    </legend>
    <p v-if="ayuda" class="ayuda">{{ ayuda }}</p>

    <input ref="entrada" class="archivo" type="file" accept="image/*" tabindex="-1" aria-hidden="true" @change="alElegir" />

    <!-- Vista previa de lo que se va a subir (en OG, el recorte exacto). -->
    <div v-if="pendiente" class="pendiente">
      <p class="subtitulo">{{ modo === 'og' ? t.vistaPreviaOg : t.vistaPrevia }}</p>
      <img class="vista-img" :src="pendiente.url" :alt="t.vistaPrevia" :width="pendiente.ancho" :height="pendiente.alto" />
      <dl class="datos">
        <div>
          <dt>{{ t.tamano }}</dt>
          <dd>{{ t.pixeles(pendiente.ancho, pendiente.alto) }}</dd>
        </div>
        <div>
          <dt>{{ t.peso }}</dt>
          <dd>{{ pesoLegible(pendiente.blob.size) }}</dd>
        </div>
      </dl>
      <div v-if="fase === 'subiendo'" class="progreso">
        <progress :value="progreso" max="1" :aria-label="t.subiendo(Math.round(progreso * 100))"></progress>
        <span role="status">{{ t.subiendo(Math.round(progreso * 100)) }}</span>
      </div>
      <div class="acciones">
        <button type="button" class="btn btn-primario" :disabled="ocupado" @click="subir">{{ t.subir }}</button>
        <button type="button" class="btn btn-borde" :disabled="ocupado" @click="soltarPendiente(); fase = 'reposo'">
          {{ t.cancelar }}
        </button>
      </div>
    </div>

    <!-- Imagen guardada en el campo. -->
    <div v-else-if="imagen" class="actual">
      <img
        v-if="!falloVistaPrevia"
        class="vista-img"
        :src="cdn(imagen.src)"
        :alt="imagen.alt"
        :width="imagen.width"
        :height="imagen.height"
        loading="lazy"
        @error="falloVistaPrevia = true"
      />
      <div v-else class="ph sin-vista">{{ t.sinVistaPrevia }}</div>
      <dl class="datos">
        <div>
          <dt>{{ t.ruta }}</dt>
          <dd><code>{{ imagen.src }}</code></dd>
        </div>
        <div>
          <dt>{{ t.tamano }}</dt>
          <dd>{{ t.pixeles(imagen.width, imagen.height) }}</dd>
        </div>
        <div v-if="pesoSubido">
          <dt>{{ t.peso }}</dt>
          <dd>{{ pesoLegible(pesoSubido) }}</dd>
        </div>
      </dl>
      <div class="acciones">
        <button type="button" class="btn btn-borde" :disabled="ocupado" @click="entrada?.click()">{{ t.reemplazar }}</button>
        <button type="button" class="btn btn-borde" :disabled="ocupado" @click="quitar">{{ t.quitar }}</button>
        <button type="button" class="btn btn-borde" :disabled="ocupado" @click="borrarDelAlmacenamiento">
          {{ fase === 'borrando' ? t.borrando : t.borrar }}
        </button>
      </div>
    </div>

    <!-- Sin imagen: zona para soltar y botón para elegir. -->
    <div v-else class="ph zona">
      <p>{{ t.soltar }}</p>
      <button type="button" class="btn btn-borde" :disabled="ocupado" @click="entrada?.click()">{{ t.elegir }}</button>
      <p class="formatos">{{ modo === 'og' ? t.formatosOg : t.formatos }}</p>
    </div>

    <p v-if="fase === 'procesando'" class="ayuda" role="status">{{ t.procesando }}</p>

    <TextField v-if="imagen && !pendiente" :ruta="`${ruta}.alt`" :etiqueta="t.alt" :ayuda="t.altAyuda" />

    <p v-if="mensajeOk" class="ok" role="status">{{ mensajeOk }}</p>
    <p v-if="mensajeError" class="error" role="alert">{{ mensajeError }}</p>
    <p v-if="errorImagen" class="error">{{ errorImagen }}</p>
  </fieldset>
</template>

<style scoped>
.imagen {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
}

.imagen:focus {
  outline: none;
}

.imagen.arrastrando {
  outline: 2px dashed var(--gold);
  outline-offset: var(--space-2);
}

legend {
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--text-label);
  color: var(--text-soft);
}

.opcional {
  color: var(--faint);
}

.ayuda,
.formatos {
  font-size: var(--text-sm);
  color: var(--muted);
}

/* El input real queda oculto: lo abren los botones (y también se puede soltar). */
.archivo {
  position: absolute;
  width: 1px;
  height: 1px;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  border: 0;
}

.zona {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  max-width: 480px;
  min-height: 180px;
  padding: var(--space-6);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-soft);
}

.pendiente,
.actual {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.subtitulo {
  font-size: var(--text-label);
  color: var(--gold-light);
}

.vista-img {
  display: block;
  max-width: min(100%, 480px);
  max-height: 300px;
  width: auto;
  height: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.sin-vista {
  display: grid;
  place-items: center;
  max-width: 420px;
  aspect-ratio: 1200 / 630;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--faint);
}

.datos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin: 0;
}

dt {
  font-size: var(--text-xs);
  color: var(--faint);
}

dd {
  margin: 0;
  color: var(--text-soft);
  overflow-wrap: anywhere;
}

code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.progreso {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-label);
  color: var(--text-soft);
}

progress {
  flex: 1;
  max-width: 320px;
  height: 8px;
  accent-color: var(--gold);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.ok {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}
</style>
