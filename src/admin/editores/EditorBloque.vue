<script setup lang="ts">
import { computed } from 'vue';

import type { Bloque } from '../../lib/bloques';
import { useBloque } from '../bloque';
import { useCambios } from '../cambios';
import { confirmar } from '../confirmar';
import { textos } from '../textos';

// Marco común de los editores: título, carga, barra de guardado con su estado
// y el formulario (los campos van en el slot).
const props = defineProps<{ nombre: Bloque }>();

const t = textos.editor;
const { estado, sucio, cantidadErrores, intentado, guardar, descartar, recargar } = useBloque(props.nombre);
const cambios = useCambios();
const sinPublicar = computed(() => cambios.pendientes.includes(props.nombre));

const textoEstado = computed(() => {
  if (estado.guardando) return t.estado.guardando;
  if (sucio.value) return t.estado.sucio;
  if (estado.guardado) return t.estado.guardado(estado.version);
  return t.estado.sinCambios;
});

async function pedirDescartar() {
  if (await confirmar(textos.confirmar.descartar)) descartar();
}
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ textos.bloques[nombre] }}</h1>

  <p v-if="estado.fase === 'cargando'" class="tenue" role="status">{{ textos.cargando }}</p>
  <p v-else-if="estado.fase === 'noExiste'" class="aviso" role="alert">{{ t.noExiste }}</p>
  <p v-else-if="estado.fase === 'errorCarga'" class="aviso" role="alert">{{ t.errorCarga }}</p>

  <form v-else class="editor" novalidate @submit.prevent="guardar">
    <p class="nota">
      {{ t.nota }}
      <template v-if="sinPublicar">
        <br />{{ t.sinPublicar }} <RouterLink :to="{ name: 'publicar' }">{{ t.irAPublicar }}</RouterLink>
      </template>
    </p>

    <slot />

    <div class="barra-guardar">
      <div class="mensajes">
        <p class="estado" :class="{ sucio }" role="status">{{ textoEstado }}</p>
        <p v-if="intentado && cantidadErrores" class="aviso-linea" role="alert">{{ t.invalido(cantidadErrores) }}</p>
        <p v-if="estado.errorGuardar" class="aviso-linea" role="alert">{{ t.errorGuardar }}</p>
      </div>
      <div class="botones">
        <button v-if="sucio" type="button" class="btn btn-borde" :disabled="estado.guardando" @click="pedirDescartar">
          {{ t.descartar }}
        </button>
        <button type="submit" class="btn btn-primario" :disabled="!sucio || estado.guardando">
          {{ estado.guardando ? t.guardando : t.guardar }}
        </button>
      </div>
    </div>

    <div v-if="estado.conflicto" class="aviso conflicto" role="alert">
      <p>{{ t.conflicto }}</p>
      <button type="button" class="btn btn-borde" @click="recargar">{{ t.cargarGuardada }}</button>
    </div>
  </form>
</template>

<style scoped>
.tenue {
  color: var(--muted);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: 880px;
}

.nota {
  font-size: var(--text-md);
  color: var(--muted);
  line-height: 1.6;
}

/* La barra queda pegada abajo: el estado y Guardar siempre a la vista. */
.barra-guardar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0 calc(-1 * var(--space-4));
  padding: var(--space-3) var(--space-4);
  background: var(--bg);
  border-top: 1px solid var(--line);
}

.mensajes {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.estado {
  font-size: var(--text-label);
  color: var(--muted);
}

.estado.sucio {
  color: var(--gold-light);
}

.aviso-linea {
  font-size: var(--text-label);
  color: var(--gold-light);
}

.botones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.conflicto {
  gap: var(--space-3);
  align-items: flex-start;
}
</style>
