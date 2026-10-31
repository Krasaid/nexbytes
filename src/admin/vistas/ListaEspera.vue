<script setup lang="ts">
import { collection, doc, getDocs, orderBy, query, updateDoc, where, type QueryConstraint, type Timestamp } from 'firebase/firestore';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { csvListaEspera, ESTADOS_LISTA, fechaCsv, fechaRelativa } from '../bandeja';
import { getServicios } from '../firebase';
import { usePaginacion } from '../paginacion';
import { textos } from '../textos';
import EstadoBadge from './EstadoBadge.vue';

// Filtro en la URL: #/bandeja/lista-espera?estado=invitado
const t = textos.bandeja;
const ruta = useRoute();
const router = useRouter();

const estadoUrl = computed(() => {
  const e = ruta.query.estado;
  return typeof e === 'string' && (ESTADOS_LISTA as readonly string[]).includes(e) ? e : '';
});
const filtrar = (estado: string) => void router.replace({ query: estado ? { estado } : {} });

const restricciones = (): QueryConstraint[] => [
  ...(estadoUrl.value ? [where('estado', '==', estadoUrl.value)] : []),
  orderBy('creadoEn', 'desc'),
];

const { docs, pagina, hayMas, cargando, error, reiniciar, siguiente, anterior, recargar } = usePaginacion('lista_espera', restricciones);
watch(estadoUrl, () => void reiniciar(), { immediate: true });

const ahora = Date.now();
const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
const filas = computed(() =>
  docs.value.map((d) => {
    const datos = d.data();
    return { id: d.id, email: datos.email as string, estado: datos.estado as string, fecha: (datos.creadoEn as Timestamp | undefined)?.toDate() };
  }),
);

// Estado por fila: se guarda al elegirlo.
const guardando = ref<string | null>(null);
const mensaje = ref('');
const errorFila = ref('');
async function cambiarEstado(id: string, estado: string) {
  guardando.value = id;
  mensaje.value = '';
  errorFila.value = '';
  try {
    await updateDoc(doc(getServicios().db, 'lista_espera', id), { estado });
    mensaje.value = t.estadoGuardado;
    // Con un filtro de estado, la fila cambiada ya no corresponde a esta lista.
    if (estadoUrl.value) await recargar();
  } catch {
    errorFila.value = t.errorGuardar;
    await recargar();
  } finally {
    guardando.value = null;
  }
}

// CSV con todos los registros del filtro actual (no solo esta página).
const exportando = ref(false);
async function exportar() {
  exportando.value = true;
  errorFila.value = '';
  try {
    const snap = await getDocs(query(collection(getServicios().db, 'lista_espera'), ...restricciones()));
    const csv = csvListaEspera(
      snap.docs.map((d) => ({ email: d.get('email'), estado: d.get('estado'), creadoEn: (d.get('creadoEn') as Timestamp | undefined)?.toDate() })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = t.csvArchivo(fechaCsv(new Date()).slice(0, 10));
    enlace.click();
    URL.revokeObjectURL(url);
  } catch {
    errorFila.value = t.errorGuardar;
  } finally {
    exportando.value = false;
  }
}
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ textos.shell.listaEspera }}</h1>

  <div class="filtros">
    <div class="campo">
      <label for="lista-estado">{{ t.filtroEstado }}</label>
      <select id="lista-estado" :value="estadoUrl" @change="filtrar(($event.target as HTMLSelectElement).value)">
        <option value="">{{ t.todos }}</option>
        <option v-for="e in ESTADOS_LISTA" :key="e" :value="e">{{ t.estadosLista[e] }}</option>
      </select>
    </div>
    <button type="button" class="btn btn-borde exportar" :disabled="exportando || !filas.length" @click="exportar">
      {{ exportando ? t.exportando : t.exportar }}
    </button>
  </div>

  <p v-if="mensaje" class="ok" role="status">{{ mensaje }}</p>
  <p v-if="errorFila" class="aviso" role="alert">{{ errorFila }}</p>

  <p v-if="error === 'indice'" class="aviso" role="alert">{{ t.faltaIndice }}</p>
  <p v-else-if="error" class="aviso" role="alert">{{ t.errorCarga }}</p>
  <p v-else-if="cargando && !filas.length" class="tenue" role="status">{{ textos.cargando }}</p>
  <p v-else-if="!filas.length" class="tenue">{{ estadoUrl ? t.sinResultados : t.sinRegistros }}</p>

  <div v-else class="tabla-contenedor" tabindex="0" :aria-label="textos.shell.listaEspera" :aria-busy="cargando">
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t.columnas.correo }}</th>
          <th scope="col">{{ t.columnas.fecha }}</th>
          <th scope="col">{{ t.columnas.estado }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in filas" :key="f.id">
          <td><a :href="`mailto:${f.email}`" class="correo">{{ f.email }}</a></td>
          <td>
            <time v-if="f.fecha" :datetime="f.fecha.toISOString()" :title="formatoFecha.format(f.fecha)">{{ fechaRelativa(f.fecha, ahora) }}</time>
          </td>
          <td>
            <div class="estado">
              <EstadoBadge :estado="f.estado" :etiquetas="t.estadosLista" />
              <select
                :aria-label="t.cambiarEstado(f.email)"
                :value="f.estado"
                :disabled="guardando === f.id"
                @change="cambiarEstado(f.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="e in ESTADOS_LISTA" :key="e" :value="e">{{ t.estadosLista[e] }}</option>
              </select>
            </div>
          </td>
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
.tenue {
  color: var(--muted);
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
}

.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 180px;
}

label {
  font-size: var(--text-label);
  color: var(--text-soft);
}

select {
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--text-label);
}

.campo select {
  min-height: 48px;
  font-size: var(--text-base);
}

.ok {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.tabla-contenedor {
  max-width: 880px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: var(--text-label);
}

th,
td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: 0;
}

th {
  font-weight: 500;
  color: var(--muted);
  background: var(--surface);
}

.correo {
  overflow-wrap: anywhere;
}

.estado {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.paginas {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
