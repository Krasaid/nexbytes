<script setup lang="ts">
import { orderBy, where, type QueryConstraint, type Timestamp } from 'firebase/firestore';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ESTADOS_COTIZACION, fechaRelativa, interpretarBusqueda } from '../bandeja';
import { usePaginacion } from '../paginacion';
import { textos } from '../textos';
import EstadoBadge from './EstadoBadge.vue';

// Filtros en la URL: #/bandeja/cotizaciones?estado=nuevo&q=maria
const t = textos.bandeja;
const ruta = useRoute();
const router = useRouter();

const estadoUrl = computed(() => {
  const e = ruta.query.estado;
  return typeof e === 'string' && (ESTADOS_COTIZACION as readonly string[]).includes(e) ? e : '';
});
const busquedaUrl = computed(() => (typeof ruta.query.q === 'string' ? ruta.query.q : ''));

const busqueda = ref(busquedaUrl.value);
watch(busquedaUrl, (q) => {
  if (q !== busqueda.value) busqueda.value = q;
});

function irA(cambios: { estado?: string; q?: string }) {
  const estado = cambios.estado ?? estadoUrl.value;
  const q = (cambios.q ?? busquedaUrl.value).trim();
  void router.replace({ query: { ...(estado ? { estado } : {}), ...(q ? { q } : {}) } });
}

// La búsqueda se aplica al dejar de escribir (300 ms), sin un botón.
let espera: ReturnType<typeof setTimeout> | undefined;
function alEscribir() {
  clearTimeout(espera);
  espera = setTimeout(() => irA({ q: busqueda.value }), 300);
}
onBeforeUnmount(() => clearTimeout(espera));

function restricciones(): QueryConstraint[] {
  const filtros: QueryConstraint[] = estadoUrl.value ? [where('estado', '==', estadoUrl.value)] : [];
  const b = interpretarBusqueda(busquedaUrl.value);
  if (b?.tipo === 'ref') return [...filtros, where('ref', '==', b.ref)];
  if (b?.tipo === 'nombre') return [...filtros, where('nombre', '>=', b.desde), where('nombre', '<=', b.hasta), orderBy('nombre')];
  return [...filtros, orderBy('creadoEn', 'desc')];
}

const { docs, pagina, hayMas, cargando, error, reiniciar, siguiente, anterior } = usePaginacion('cotizaciones', restricciones);
watch([estadoUrl, busquedaUrl], () => void reiniciar(), { immediate: true });

const filtrando = computed(() => Boolean(estadoUrl.value || busquedaUrl.value));
const ahora = Date.now();
const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
const filas = computed(() =>
  docs.value.map((d) => {
    const datos = d.data();
    const fecha = (datos.creadoEn as Timestamp | undefined)?.toDate();
    return { id: d.id, ref: datos.ref, nombre: datos.nombre, empresa: datos.empresa, tipo: datos.tipo, presupuesto: datos.presupuesto, estado: datos.estado, fecha };
  }),
);
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ textos.shell.cotizaciones }}</h1>

  <div class="filtros" role="search">
    <div class="campo">
      <label for="filtro-estado">{{ t.filtroEstado }}</label>
      <select id="filtro-estado" :value="estadoUrl" @change="irA({ estado: ($event.target as HTMLSelectElement).value })">
        <option value="">{{ t.todos }}</option>
        <option v-for="e in ESTADOS_COTIZACION" :key="e" :value="e">{{ t.estadosCotizacion[e] }}</option>
      </select>
    </div>
    <div class="campo busqueda">
      <label for="filtro-buscar">{{ t.buscar }}</label>
      <input id="filtro-buscar" v-model="busqueda" type="search" autocomplete="off" aria-describedby="filtro-buscar-ayuda" @input="alEscribir" />
      <p id="filtro-buscar-ayuda" class="ayuda">{{ t.buscarAyuda }}</p>
    </div>
    <button v-if="filtrando" type="button" class="btn btn-borde limpiar" @click="busqueda = ''; irA({ estado: '', q: '' })">
      {{ t.limpiar }}
    </button>
  </div>

  <p v-if="error === 'indice'" class="aviso" role="alert">{{ t.faltaIndice }}</p>
  <p v-else-if="error" class="aviso" role="alert">{{ t.errorCarga }}</p>
  <p v-else-if="cargando && !filas.length" class="tenue" role="status">{{ textos.cargando }}</p>
  <p v-else-if="!filas.length" class="tenue">{{ filtrando ? t.sinResultados : t.sinCotizaciones }}</p>

  <div v-else class="tabla-contenedor" tabindex="0" :aria-label="textos.shell.cotizaciones" :aria-busy="cargando">
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t.columnas.ref }}</th>
          <th scope="col">{{ t.columnas.nombre }}</th>
          <th scope="col">{{ t.columnas.tipo }}</th>
          <th scope="col">{{ t.columnas.presupuesto }}</th>
          <th scope="col">{{ t.columnas.fecha }}</th>
          <th scope="col">{{ t.columnas.estado }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in filas" :key="f.id">
          <td><RouterLink :to="{ name: 'cotizacion', params: { id: f.id } }" class="ref">{{ f.ref }}</RouterLink></td>
          <td>
            {{ f.nombre }}
            <span v-if="f.empresa" class="tenue empresa">{{ f.empresa }}</span>
          </td>
          <td>{{ f.tipo }}</td>
          <td>{{ f.presupuesto }}</td>
          <td>
            <time v-if="f.fecha" :datetime="f.fecha.toISOString()" :title="formatoFecha.format(f.fecha)">{{ fechaRelativa(f.fecha, ahora) }}</time>
          </td>
          <td><EstadoBadge :estado="f.estado" :etiquetas="t.estadosCotizacion" /></td>
        </tr>
      </tbody>
    </table>
  </div>

  <nav v-if="pagina > 0 || hayMas" class="paginas" :aria-label="t.pagina(pagina + 1)">
    <button type="button" class="btn btn-borde" :disabled="pagina === 0 || cargando" @click="anterior">{{ t.anterior }}</button>
    <span class="tenue">{{ t.pagina(pagina + 1) }}</span>
    <button type="button" class="btn btn-borde" :disabled="!hayMas || cargando" @click="siguiente">{{ t.siguiente }}</button>
  </nav>
</template>

<style scoped>
.tenue,
.ayuda {
  color: var(--muted);
}

.ayuda {
  font-size: var(--text-sm);
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-4);
  max-width: 880px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 180px;
}

.busqueda {
  flex: 1 1 280px;
}

label {
  font-size: var(--text-label);
  color: var(--text-soft);
}

select {
  min-height: 48px;
  padding: 0 var(--space-4);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--text-base);
}

.limpiar {
  align-self: flex-end;
  margin-bottom: calc(var(--space-2) + 1.4em);
}

.tabla-contenedor {
  max-width: 1080px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: var(--text-label);
}

th,
td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: 0;
}

th {
  font-weight: 500;
  color: var(--muted);
  background: var(--surface);
}

.ref {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-min);
  margin-block: calc(-1 * var(--space-3));
  font-family: var(--font-mono);
  font-weight: 500;
}

.empresa {
  display: block;
  font-size: var(--text-sm);
}

.paginas {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
