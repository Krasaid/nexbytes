<script setup lang="ts">
import { collection, limit, onSnapshot, orderBy, query, type Timestamp, type Unsubscribe } from 'firebase/firestore';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useCambios } from '../cambios';
import { confirmar } from '../confirmar';
import { getServicios } from '../firebase';
import { BorradoresInvalidos, publicar, PublicacionNoEnviada, type Tipo } from '../publicacion';
import { enCurso, estadoVisible, type ErrorDeBloque, type Publicacion } from '../publicar';
import { textos } from '../textos';

const t = textos.publicar;
const cambios = useCambios();

// Historial en vivo: las últimas 10, la más nueva primero (incluye la que está en curso).
const historial = ref<Publicacion[]>([]);
const historialListo = ref(false);
const fecha = (valor: unknown) => (valor as Timestamp | null | undefined)?.toDate?.();
let detener: Unsubscribe | undefined;

// El estado "sin respuesta" depende de la hora: se recalcula cada 30 s.
const ahora = ref(Date.now());
let reloj: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  const consulta = query(collection(getServicios().db, 'publicaciones'), orderBy('solicitadaEn', 'desc'), limit(10));
  detener = onSnapshot(consulta, (snap) => {
    historial.value = snap.docs.map((d) => {
      const datos = d.data({ serverTimestamps: 'estimate' });
      return {
        id: d.id,
        estado: datos.estado,
        tipo: datos.tipo,
        solicitadaEn: fecha(datos.solicitadaEn),
        terminadaEn: fecha(datos.terminadaEn),
        url: datos.url,
        error: datos.error,
      };
    });
    historialListo.value = true;
  });
  reloj = setInterval(() => (ahora.value = Date.now()), 30_000);
});

onBeforeUnmount(() => {
  detener?.();
  clearInterval(reloj);
});

const actual = computed(() => historial.value[0]);
const hayEnCurso = computed(() => historial.value.some((p) => enCurso(p, ahora.value)));
const trabajando = ref<Tipo | null>(null);
const bloqueado = computed(() => trabajando.value !== null || hayEnCurso.value);

const mensaje = ref('');
const aviso = ref('');
const errores = ref<ErrorDeBloque[]>([]);

const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
const estado = (p: Publicacion) => textos.publicaciones.estados[estadoVisible(p, ahora.value)] ?? p.estado;
const tipo = (p: Publicacion) => textos.publicaciones.tipos[p.tipo] ?? p.tipo;
const nombresPendientes = computed(() => cambios.pendientes.map((b) => textos.bloques[b]).join(', '));

async function pedir(tipoPedido: Tipo) {
  if (bloqueado.value) return;
  if (tipoPedido === 'produccion') {
    const c = textos.confirmar.publicar;
    if (!(await confirmar({ titulo: c.titulo, texto: c.texto(nombresPendientes.value), accion: c.accion }))) return;
  }
  trabajando.value = tipoPedido;
  mensaje.value = '';
  aviso.value = '';
  errores.value = [];
  try {
    await publicar(tipoPedido);
    mensaje.value = t.solicitadaOk;
  } catch (error) {
    if (error instanceof BorradoresInvalidos) errores.value = error.errores;
    else if (error instanceof PublicacionNoEnviada) {
      aviso.value = error.noConfigurada
        ? `${error.message}. ${tipoPedido === 'produccion' ? t.manualProduccion : t.manualPreview}`
        : error.message;
    } else aviso.value = error instanceof Error ? error.message : t.errorGuardar;
  } finally {
    trabajando.value = null;
  }
}
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ t.titulo }}</h1>
  <p class="descripcion">{{ t.descripcion }}</p>

  <section class="tarjeta" aria-labelledby="publicar-cambios">
    <h2 id="publicar-cambios">{{ t.cambios }}</h2>
    <p v-if="!cambios.listo" class="tenue">{{ textos.cargando }}</p>
    <p v-else-if="!cambios.pendientes.length" class="tenue">{{ t.sinCambios }}</p>
    <ul v-else class="bloques">
      <li v-for="bloque in cambios.pendientes" :key="bloque">
        <RouterLink :to="{ name: 'contenido', params: { bloque } }">{{ textos.bloques[bloque] }}</RouterLink>
      </li>
    </ul>

    <div class="acciones">
      <button type="button" class="btn btn-borde" :disabled="bloqueado" @click="pedir('preview')">
        {{ trabajando === 'preview' ? t.trabajando : t.vistaPrevia }}
      </button>
      <button
        type="button"
        class="btn btn-primario"
        :disabled="bloqueado || !cambios.listo || !cambios.pendientes.length"
        @click="pedir('produccion')"
      >
        {{ trabajando === 'produccion' ? t.trabajando : t.publicar }}
      </button>
    </div>
    <p v-if="hayEnCurso" class="tenue" role="status">{{ t.enCurso }}</p>

    <div v-if="errores.length" class="aviso" role="alert">
      <p>{{ t.invalidos }}</p>
      <ul class="errores">
        <li v-for="e in errores" :key="e.bloque">
          <RouterLink :to="{ name: 'contenido', params: { bloque: e.bloque } }">{{ textos.bloques[e.bloque] }}</RouterLink>:
          <template v-if="e.ruta"><code>{{ e.ruta }}</code> — </template>{{ e.mensaje }}
        </li>
      </ul>
    </div>
    <p v-if="aviso" class="aviso" role="alert">{{ aviso }}</p>
    <p v-if="mensaje" class="ok" role="status">{{ mensaje }}</p>
  </section>

  <section v-if="actual" class="tarjeta" aria-labelledby="publicar-actual">
    <h2 id="publicar-actual">{{ t.actual }}</h2>
    <p class="estado-actual" aria-live="polite">
      <span class="estado" :data-estado="estadoVisible(actual, ahora)">{{ estado(actual) }}</span>
      <span class="tenue">· {{ tipo(actual) }}<template v-if="actual.solicitadaEn"> · {{ formatoFecha.format(actual.solicitadaEn) }}</template></span>
    </p>
    <p v-if="actual.estado === 'publicada' && actual.url">
      <a :href="actual.url" target="_blank" rel="noopener noreferrer">{{ actual.tipo === 'preview' ? t.abrirPreview : t.abrirSitio }}</a>
    </p>
    <p v-if="actual.estado === 'error' && actual.error" class="error-texto">{{ actual.error }}</p>
  </section>

  <section class="tarjeta" aria-labelledby="publicar-historial">
    <h2 id="publicar-historial">{{ t.historial }}</h2>
    <p v-if="!historialListo" class="tenue">{{ textos.cargando }}</p>
    <p v-else-if="!historial.length" class="tenue">{{ t.sinHistorial }}</p>
    <div v-else class="tabla-contenedor" tabindex="0" :aria-label="t.historial">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t.columnas.fecha }}</th>
            <th scope="col">{{ t.columnas.tipo }}</th>
            <th scope="col">{{ t.columnas.estado }}</th>
            <th scope="col">{{ t.columnas.resultado }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in historial" :key="p.id">
            <td>{{ p.solicitadaEn ? formatoFecha.format(p.solicitadaEn) : '—' }}</td>
            <td>{{ tipo(p) }}</td>
            <td><span class="estado" :data-estado="estadoVisible(p, ahora)">{{ estado(p) }}</span></td>
            <td class="resultado">
              <a v-if="p.url" :href="p.url" target="_blank" rel="noopener noreferrer">{{ p.url.replace(/^https:\/\//, '') }}</a>
              <span v-else-if="p.error" class="error-texto">{{ p.error }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.descripcion,
.tenue {
  color: var(--muted);
}

.descripcion {
  max-width: 720px;
  line-height: 1.6;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 880px;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

h2 {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--muted);
}

.bloques {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bloques a {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.errores {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-5);
}

code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.ok {
  color: var(--text-soft);
}

.estado-actual {
  font-size: var(--text-lg);
}

.estado {
  color: var(--text);
  font-weight: 600;
}

.estado[data-estado='publicada'] {
  color: var(--gold-light);
}

.estado[data-estado='error'],
.estado[data-estado='sinRespuesta'] {
  color: var(--muted);
}

.error-texto {
  color: var(--gold-light);
  font-size: var(--text-label);
}

.tabla-contenedor {
  overflow-x: auto;
}

/* En pantallas angostas la tabla se desplaza dentro de la tarjeta en vez de cortar palabras. */
table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: var(--text-label);
}

th,
td {
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

th {
  font-weight: 500;
  color: var(--muted);
}

.resultado {
  overflow-wrap: break-word;
}
</style>
