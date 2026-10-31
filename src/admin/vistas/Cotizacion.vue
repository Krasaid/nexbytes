<script setup lang="ts">
import { doc, onSnapshot, updateDoc, type Timestamp, type Unsubscribe } from 'firebase/firestore';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { LIMITES } from '../../lib/limites';
import { ESTADOS_COTIZACION, enlaceCorreo, enlaceWhatsapp, fechaRelativa, type Cotizacion } from '../bandeja';
import { hayCambiosSinGuardar } from '../bloque';
import { getServicios } from '../firebase';
import { textos } from '../textos';
import EstadoBadge from './EstadoBadge.vue';

const t = textos.bandeja;
const ruta = useRoute();
const id = computed(() => String(ruta.params.id));

const cotizacion = ref<Cotizacion | null | undefined>(undefined); // undefined = cargando, null = no existe
let detener: Unsubscribe | undefined;

// Notas: se editan aparte y se guardan con su botón. Lo que llega en vivo no pisa lo que se está escribiendo.
const notas = ref('');
const notasGuardadas = ref('');
const notasSucias = computed(() => notas.value !== notasGuardadas.value);
const notasLargas = computed(() => notas.value.length > LIMITES.notas);
watch(notasSucias, (sucias) => (hayCambiosSinGuardar.value = sucias));

onMounted(() => {
  detener = onSnapshot(
    doc(getServicios().db, 'cotizaciones', id.value),
    (snap) => {
      if (!snap.exists()) {
        cotizacion.value = null;
        return;
      }
      const d = snap.data({ serverTimestamps: 'estimate' });
      cotizacion.value = { ...(d as Omit<Cotizacion, 'id' | 'creadoEn'>), id: snap.id, creadoEn: (d.creadoEn as Timestamp | undefined)?.toDate() };
      const remotas = (d.notas as string | undefined) ?? '';
      if (!notasSucias.value) notas.value = remotas;
      notasGuardadas.value = remotas;
    },
    () => (cotizacion.value = null),
  );
});

onBeforeUnmount(() => {
  detener?.();
  hayCambiosSinGuardar.value = false;
});

const referencia = () => doc(getServicios().db, 'cotizaciones', id.value);

const guardandoEstado = ref(false);
const mensajeEstado = ref('');
const errorEstado = ref('');
async function cambiarEstado(estado: string) {
  if (!cotizacion.value || estado === cotizacion.value.estado) return;
  guardandoEstado.value = true;
  mensajeEstado.value = '';
  errorEstado.value = '';
  try {
    await updateDoc(referencia(), { estado });
    mensajeEstado.value = t.estadoGuardado;
  } catch {
    errorEstado.value = t.errorGuardar;
  } finally {
    guardandoEstado.value = false;
  }
}

const guardandoNotas = ref(false);
const mensajeNotas = ref('');
const errorNotas = ref('');
async function guardarNotas() {
  if (!notasSucias.value || notasLargas.value) return;
  guardandoNotas.value = true;
  mensajeNotas.value = '';
  errorNotas.value = '';
  try {
    await updateDoc(referencia(), { notas: notas.value });
    notasGuardadas.value = notas.value;
    mensajeNotas.value = t.notasGuardadas;
  } catch {
    errorNotas.value = t.errorGuardar;
  } finally {
    guardandoNotas.value = false;
  }
}

const whatsapp = computed(() => (cotizacion.value ? enlaceWhatsapp(cotizacion.value) : undefined));
const correo = computed(() => (cotizacion.value ? enlaceCorreo(cotizacion.value) : undefined));
const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'long', timeStyle: 'short' });

// "Volver" regresa a la lista con los filtros con los que se llegó.
const volver = computed(() => {
  const atras = (window.history.state as { back?: string } | null)?.back;
  return atras?.startsWith('/bandeja/cotizaciones') ? atras : { name: 'cotizaciones' };
});
</script>

<template>
  <RouterLink :to="volver" class="volver">← {{ t.volver }}</RouterLink>

  <p v-if="cotizacion === undefined" class="tenue" role="status">{{ textos.cargando }}</p>
  <template v-else-if="cotizacion === null">
    <h1 id="admin-titulo" tabindex="-1">{{ textos.shell.cotizaciones }}</h1>
    <p class="aviso" role="alert">{{ t.noExiste }}</p>
  </template>

  <template v-else>
    <div class="encabezado">
      <h1 id="admin-titulo" tabindex="-1">{{ t.cotizacion(cotizacion.ref) }}</h1>
      <EstadoBadge :estado="cotizacion.estado" :etiquetas="t.estadosCotizacion" />
    </div>

    <div class="contactar">
      <a v-if="whatsapp" class="btn btn-primario" :href="whatsapp" target="_blank" rel="noopener noreferrer">{{ t.escribirWhatsapp }}</a>
      <a v-if="correo" class="btn btn-borde" :href="correo">{{ t.escribirCorreo }}</a>
    </div>

    <div class="rejilla">
      <section class="tarjeta" aria-labelledby="cot-contacto">
        <h2 id="cot-contacto">{{ t.contacto }}</h2>
        <dl>
          <div><dt>{{ t.campos.nombre }}</dt><dd>{{ cotizacion.nombre }}</dd></div>
          <div><dt>{{ t.campos.empresa }}</dt><dd>{{ cotizacion.empresa || t.vacio }}</dd></div>
          <div><dt>{{ t.campos.correo }}</dt><dd>{{ cotizacion.correo || t.vacio }}</dd></div>
          <div><dt>{{ t.campos.whatsapp }}</dt><dd>{{ cotizacion.whatsapp || t.vacio }}</dd></div>
        </dl>
      </section>

      <section class="tarjeta" aria-labelledby="cot-proyecto">
        <h2 id="cot-proyecto">{{ t.proyecto }}</h2>
        <dl>
          <div><dt>{{ t.campos.tipo }}</dt><dd>{{ cotizacion.tipo }}</dd></div>
          <div>
            <dt>{{ t.campos.funciones }}</dt>
            <dd>
              <ul v-if="cotizacion.funciones?.length" class="funciones">
                <li v-for="f in cotizacion.funciones" :key="f">{{ f }}</li>
              </ul>
              <template v-else>{{ t.vacio }}</template>
            </dd>
          </div>
          <div><dt>{{ t.campos.plazo }}</dt><dd>{{ cotizacion.plazo }}</dd></div>
          <div><dt>{{ t.campos.presupuesto }}</dt><dd>{{ cotizacion.presupuesto }}</dd></div>
          <div class="ancho"><dt>{{ t.campos.descripcion }}</dt><dd class="idea">{{ cotizacion.descripcion || t.vacio }}</dd></div>
        </dl>
      </section>

      <section class="tarjeta" aria-labelledby="cot-datos">
        <h2 id="cot-datos">{{ t.datos }}</h2>
        <dl>
          <div><dt>{{ t.campos.ref }}</dt><dd><code>{{ cotizacion.ref }}</code></dd></div>
          <div>
            <dt>{{ t.campos.fecha }}</dt>
            <dd v-if="cotizacion.creadoEn">
              {{ formatoFecha.format(cotizacion.creadoEn) }}
              <span class="tenue">({{ fechaRelativa(cotizacion.creadoEn) }})</span>
            </dd>
          </div>
          <div><dt>{{ t.campos.canal }}</dt><dd>{{ cotizacion.canal }}</dd></div>
        </dl>
      </section>

      <section class="tarjeta" aria-labelledby="cot-estado">
        <fieldset class="estados" :disabled="guardandoEstado">
          <legend id="cot-estado">{{ t.estado }}</legend>
          <label v-for="e in ESTADOS_COTIZACION" :key="e" class="opcion" :class="{ elegido: cotizacion.estado === e }">
            <input type="radio" name="estado" :value="e" :checked="cotizacion.estado === e" @change="cambiarEstado(e)" />
            {{ t.estadosCotizacion[e] }}
          </label>
        </fieldset>
        <p v-if="mensajeEstado" class="ok" role="status">{{ mensajeEstado }}</p>
        <p v-if="errorEstado" class="aviso" role="alert">{{ errorEstado }}</p>
      </section>

      <section class="tarjeta ancho" aria-labelledby="cot-notas">
        <h2 id="cot-notas">{{ t.notas }}</h2>
        <div class="campo-notas">
          <div class="cabecera-notas">
            <label for="cot-notas-texto" class="sr-only">{{ t.notas }}</label>
            <span class="contador" :class="{ excedido: notasLargas }">{{ textos.campos.contador(notas.length, LIMITES.notas) }}</span>
          </div>
          <p id="cot-notas-ayuda" class="ayuda">{{ t.notasAyuda }}</p>
          <textarea
            id="cot-notas-texto"
            v-model="notas"
            rows="5"
            aria-describedby="cot-notas-ayuda"
            :aria-invalid="notasLargas ? 'true' : undefined"
          ></textarea>
          <p v-if="notasLargas" class="aviso-linea">{{ textos.errores.maxCaracteres(LIMITES.notas) }}</p>
        </div>
        <div class="acciones-notas">
          <button type="button" class="btn btn-primario" :disabled="!notasSucias || notasLargas || guardandoNotas" @click="guardarNotas">
            {{ guardandoNotas ? t.guardandoNotas : t.guardarNotas }}
          </button>
          <span v-if="notasSucias" class="aviso-linea" role="status">{{ t.notasSinGuardar }}</span>
          <span v-else-if="mensajeNotas" class="ok" role="status">{{ mensajeNotas }}</span>
        </div>
        <p v-if="errorNotas" class="aviso" role="alert">{{ errorNotas }}</p>
      </section>
    </div>
  </template>
</template>

<style scoped>
.volver {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: var(--tap-min);
}

.tenue,
.ayuda {
  color: var(--muted);
}

.ayuda {
  font-size: var(--text-sm);
}

.encabezado {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.contactar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.rejilla {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  max-width: 1080px;
}

.ancho {
  grid-column: 1 / -1;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

h2,
legend {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--muted);
}

dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: 0;
}

dl .ancho {
  grid-column: 1 / -1;
}

dt {
  font-size: var(--text-xs);
  color: var(--faint);
}

dd {
  margin: 0;
  color: var(--text);
  overflow-wrap: anywhere;
}

.idea {
  white-space: pre-line;
  line-height: 1.55;
}

.funciones {
  margin: 0;
  padding-left: var(--space-4);
}

code {
  font-family: var(--font-mono);
}

.estados {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.estados legend {
  margin-bottom: var(--space-3);
  padding: 0;
}

.opcion {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-soft);
}

.opcion.elegido {
  border-color: var(--gold);
  background: var(--gold-tint);
  color: var(--gold-light);
}

.opcion input {
  width: auto;
  min-height: 0;
  accent-color: var(--gold);
}

.opcion:has(input:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.campo-notas {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cabecera-notas {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.contador {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--faint);
}

.contador.excedido {
  color: var(--gold);
  font-weight: 600;
}

textarea {
  line-height: 1.5;
}

.acciones-notas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.ok {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.aviso-linea {
  font-size: var(--text-label);
  color: var(--gold-light);
}

@media (max-width: 767px) {
  .rejilla,
  dl {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
