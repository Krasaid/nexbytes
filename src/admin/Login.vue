<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { mensajeDeLogin } from './acceso';
import { useSesion } from './sesion';
import { textos } from './textos';

const t = textos.login;
const { estado, entrar } = useSesion();

const correo = ref('');
const contrasena = ref('');
const enviando = ref(false);
const error = ref('');
const cajaError = ref<HTMLElement | null>(null);

async function enviar() {
  enviando.value = true;
  error.value = '';
  try {
    await entrar(correo.value, contrasena.value);
  } catch (e) {
    error.value = mensajeDeLogin((e as { code?: string }).code);
    contrasena.value = '';
    await nextTick();
    cajaError.value?.focus();
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <main id="admin-principal" class="login">
    <div class="panel">
      <p class="marca">{{ textos.marca }} <span>{{ textos.marcaAdmin }}</span></p>
      <h1>{{ t.titulo }}</h1>
      <p class="descripcion">{{ t.descripcion }}</p>

      <div v-if="estado.sinAcceso" class="aviso" role="alert">
        <p class="aviso-titulo">{{ textos.sinAcceso.titulo }}</p>
        <p>{{ textos.sinAcceso.texto }}</p>
      </div>

      <form class="formulario" @submit.prevent="enviar">
        <div class="campo">
          <label for="login-correo">{{ t.correo }}</label>
          <input id="login-correo" v-model="correo" type="email" autocomplete="username" required />
        </div>
        <div class="campo">
          <label for="login-contrasena">{{ t.contrasena }}</label>
          <input
            id="login-contrasena"
            v-model="contrasena"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <div v-if="error" ref="cajaError" class="aviso" role="alert" tabindex="-1">{{ error }}</div>
        <button class="btn btn-primario" type="submit" :disabled="enviando">
          {{ enviando ? t.entrando : t.entrar }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.login {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: var(--space-6) var(--gutter);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: 420px;
  padding: var(--space-8);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
}

.marca {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-brand);
  text-transform: uppercase;
  color: var(--gold);
}

.marca span {
  color: var(--muted);
}

h1 {
  font-size: var(--text-4xl);
  font-weight: 600;
}

.descripcion {
  color: var(--muted);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.aviso-titulo {
  font-weight: 600;
  color: var(--text);
}

@media (max-width: 480px) {
  .panel {
    padding: var(--space-6);
  }
}
</style>
