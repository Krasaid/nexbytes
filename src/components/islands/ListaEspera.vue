<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { isEmail, submitWaitlist } from '../../lib/forms';
import { LIMITES } from '../../lib/limites';
import type { Producto } from '../../lib/schemas';

const props = defineProps<{ textos: Producto['listaEspera'] }>();

const email = ref('');
const error = ref(false);
const sending = ref(false);
const joined = ref(false);
/** Firestore falló. */
const sendError = ref(false);
const successTitle = ref<HTMLElement | null>(null);
const trampa = ref<HTMLInputElement | null>(null);

async function onSubmit() {
  if (!isEmail(email.value)) {
    error.value = true;
    return;
  }
  error.value = false;
  sendError.value = false;
  sending.value = true;
  try {
    await submitWaitlist(email.value.trim(), trampa.value?.value ?? '');
  } catch (e) {
    console.error(e);
    sendError.value = true;
    return;
  } finally {
    sending.value = false;
  }
  joined.value = true;
  await nextTick();
  successTitle.value?.focus();
}
</script>

<template>
  <div class="lista">
    <template v-if="!joined">
      <h3>{{ props.textos.titulo }}</h3>
      <p class="texto">{{ props.textos.texto }}</p>
      <form class="form" novalidate @submit.prevent="onSubmit">
        <!-- Campo trampa: invisible para personas, los bots lo llenan. -->
        <div class="trampa" aria-hidden="true">
          <input ref="trampa" type="text" name="sitio_web" tabindex="-1" autocomplete="off" />
        </div>
        <label for="wait-email">{{ props.textos.label }}</label>
        <input
          id="wait-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          :maxlength="LIMITES.correo"
          :placeholder="props.textos.placeholder"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? 'wait-email-error' : undefined"
          @input="error = false"
        />
        <p v-if="error" id="wait-email-error" class="error" role="alert">{{ props.textos.error }}</p>
        <p v-if="sendError" class="error" role="alert">{{ props.textos.errorEnvio }}</p>
        <button type="submit" class="submit" :disabled="sending">
          {{ sending ? props.textos.enviando : props.textos.boton }}
        </button>
      </form>
    </template>

    <div v-else class="exito" aria-live="polite">
      <h3 ref="successTitle" tabindex="-1">{{ props.textos.exitoTitulo }}</h3>
      <p class="texto">{{ props.textos.exitoTexto }}</p>
    </div>
  </div>
</template>

<style scoped>
.lista,
.form,
.exito {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

h3 {
  font-size: var(--text-xl);
}

/* Fuera de pantalla (no display:none: algunos bots ignoran los campos ocultos). */
.trampa {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.exito h3 {
  color: var(--gold);
}

.texto {
  font-size: var(--text-md);
  line-height: 1.55;
  color: var(--muted);
}

label {
  margin-bottom: calc(var(--space-2) * -1);
  font-size: var(--text-label);
  color: var(--text-soft);
}

.error {
  margin-top: calc(var(--space-2) * -1);
  font-size: var(--text-label);
  color: var(--gold-light);
}

.submit {
  min-height: 48px;
  padding: 14px 20px;
  background: var(--gold);
  color: var(--on-gold);
  border: 0;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.submit:hover {
  background: var(--gold-light);
}

.submit:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
