<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import { responder, useConfirmacion } from './confirmar';
import { textos } from './textos';

// <dialog> nativo con showModal(): atrapa el foco, Escape cancela, el resto de
// la página queda inerte y al cerrar el foco vuelve a donde estaba.
const estado = useConfirmacion();
const dialogo = ref<HTMLDialogElement | null>(null);
const cancelar = ref<HTMLButtonElement | null>(null);

watch(
  () => estado.pedido,
  async (pedido) => {
    const d = dialogo.value;
    if (!d) return;
    if (pedido && !d.open) {
      d.showModal();
      await nextTick();
      cancelar.value?.focus(); // La opción segura empieza con el foco.
    } else if (!pedido && d.open) {
      d.close();
    }
  },
);
</script>

<template>
  <dialog
    ref="dialogo"
    class="dialogo"
    role="alertdialog"
    aria-labelledby="confirmacion-titulo"
    aria-describedby="confirmacion-texto"
    @cancel.prevent="responder(false)"
  >
    <template v-if="estado.pedido">
      <h2 id="confirmacion-titulo">{{ estado.pedido.titulo }}</h2>
      <p id="confirmacion-texto">{{ estado.pedido.texto }}</p>
      <div class="acciones">
        <button ref="cancelar" type="button" class="btn btn-borde" @click="responder(false)">
          {{ textos.confirmar.cancelar }}
        </button>
        <button type="button" class="btn btn-primario" @click="responder(true)">{{ estado.pedido.accion }}</button>
      </div>
    </template>
  </dialog>
</template>

<style scoped>
.dialogo {
  /* El reset de global.css pone margin: 0 a todo; el diálogo modal se centra con auto. */
  margin: auto;
  width: min(440px, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-6);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  color: var(--text);
}

.dialogo::backdrop {
  background: var(--overlay);
}

h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
}

p {
  margin-top: var(--space-3);
  color: var(--text-soft);
  line-height: 1.55;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}
</style>
