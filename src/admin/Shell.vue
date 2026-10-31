<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { NOMBRES_BLOQUES } from '../lib/bloques';
import { hayCambiosSinGuardar } from './bloque';
import { useCambios } from './cambios';
import Confirmacion from './Confirmacion.vue';
import { confirmar } from './confirmar';
import { useSesion } from './sesion';
import { textos } from './textos';

const t = textos.shell;
const { estado, salir } = useSesion();
const cambios = useCambios();
const router = useRouter();

// ── Menú móvil (en escritorio la barra lateral siempre se ve) ──
const menuAbierto = ref(false);
const botonMenu = ref<HTMLButtonElement | null>(null);

function cerrarMenu(devolverFoco = false) {
  if (!menuAbierto.value) return;
  menuAbierto.value = false;
  if (devolverFoco) botonMenu.value?.focus();
}

function alPulsarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') cerrarMenu(true);
}

onMounted(() => {
  document.addEventListener('keydown', alPulsarTecla);
  // Al entrar (login o sesión restaurada), el foco empieza en el título de la página.
  void router.isReady().then(() => nextTick(() => document.getElementById('admin-titulo')?.focus()));
});
onBeforeUnmount(() => document.removeEventListener('keydown', alPulsarTecla));

// Al cambiar de página: se cierra el menú y el foco va al título, para que
// teclado y lector de pantalla empiecen en el contenido nuevo.
const quitarAfterEach = router.afterEach((hacia, desde) => {
  cerrarMenu();
  if (hacia.fullPath === desde.fullPath) return;
  void nextTick(() => document.getElementById('admin-titulo')?.focus());
});
onBeforeUnmount(quitarAfterEach);

async function cerrarSesion() {
  if (hayCambiosSinGuardar.value && !(await confirmar(textos.confirmar.cerrarSesion))) return;
  hayCambiosSinGuardar.value = false;
  await salir();
}

// El salto no usa el hash: en modo hash el router lo tomaría como una ruta.
function saltarAlContenido() {
  document.getElementById('admin-principal')?.focus();
}
</script>

<template>
  <a class="saltar" href="#admin-principal" @click.prevent="saltarAlContenido">{{ textos.saltarContenido }}</a>

  <div class="shell">
    <header class="barra">
      <button
        ref="botonMenu"
        class="btn-menu"
        type="button"
        aria-controls="admin-nav"
        :aria-expanded="menuAbierto"
        :aria-label="menuAbierto ? t.cerrarMenu : t.abrirMenu"
        @click="menuAbierto = !menuAbierto"
      >
        <svg v-if="!menuAbierto" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <svg v-else aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      <RouterLink :to="{ name: 'inicio' }" class="marca">{{ textos.marca }} <span>{{ textos.marcaAdmin }}</span></RouterLink>

      <RouterLink
        :to="{ name: 'publicar' }"
        class="indicador"
        :class="{ pendiente: cambios.pendientes.length > 0 }"
        aria-live="polite"
      >
        <span class="punto" aria-hidden="true"></span>
        <template v-if="!cambios.listo">{{ t.revisandoCambios }}</template>
        <template v-else-if="cambios.pendientes.length">{{ t.sinPublicar(cambios.pendientes.length) }}</template>
        <template v-else>{{ t.todoPublicado }}</template>
      </RouterLink>

      <div class="usuario">
        <span class="correo"><span class="sr-only">{{ t.sesionDe }} </span>{{ estado.correo }}</span>
        <button class="btn btn-borde" type="button" @click="cerrarSesion">{{ t.cerrarSesion }}</button>
      </div>
    </header>

    <nav id="admin-nav" class="nav" :class="{ abierto: menuAbierto }" :aria-label="t.navegacion">
      <ul class="grupo">
        <li><RouterLink :to="{ name: 'inicio' }" exact-active-class="activo">{{ t.inicio }}</RouterLink></li>
      </ul>

      <p class="titulo-grupo" id="nav-contenido">{{ t.contenido }}</p>
      <ul class="grupo" aria-labelledby="nav-contenido">
        <li v-for="bloque in NOMBRES_BLOQUES" :key="bloque">
          <RouterLink :to="{ name: 'contenido', params: { bloque } }" active-class="activo">
            {{ textos.bloques[bloque] }}
            <span v-if="cambios.pendientes.includes(bloque)" class="marca-cambio" :title="t.sinPublicar(1)">
              <span class="sr-only">({{ t.sinPublicar(1) }})</span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <p class="titulo-grupo" id="nav-bandeja">{{ t.bandeja }}</p>
      <ul class="grupo" aria-labelledby="nav-bandeja">
        <li><RouterLink :to="{ name: 'cotizaciones' }" active-class="activo">{{ t.cotizaciones }}</RouterLink></li>
        <li><RouterLink :to="{ name: 'lista-espera' }" active-class="activo">{{ t.listaEspera }}</RouterLink></li>
      </ul>

      <ul class="grupo separado">
        <li><RouterLink :to="{ name: 'publicar' }" active-class="activo">{{ t.publicar }}</RouterLink></li>
      </ul>

      <div class="usuario-movil">
        <span class="correo">{{ estado.correo }}</span>
        <button class="btn btn-borde" type="button" @click="cerrarSesion">{{ t.cerrarSesion }}</button>
      </div>
    </nav>

    <main id="admin-principal" class="principal" tabindex="-1">
      <RouterView />
    </main>
  </div>

  <Confirmacion />
</template>

<style scoped>
.saltar {
  position: fixed;
  top: var(--space-3);
  left: var(--space-3);
  z-index: 100;
  padding: var(--space-3) var(--space-4);
  background: var(--gold);
  color: var(--on-gold);
  border-radius: var(--radius-sm);
  font-weight: 600;
  transform: translateY(-200%);
}

.saltar:focus-visible {
  transform: none;
  color: var(--on-gold);
}

.shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'barra barra'
    'nav principal';
  min-height: 100vh;
}

/* ── Barra superior ── */
.barra {
  grid-area: barra;
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: 64px;
  padding: var(--space-2) var(--gutter);
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.btn-menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  background: transparent;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--text);
  cursor: pointer;
}

.marca {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-brand);
  text-transform: uppercase;
  color: var(--gold);
}

.marca span {
  color: var(--muted);
}

.indicador {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  min-height: var(--tap-min);
  margin-left: auto;
  padding: 0 var(--space-3);
  font-size: var(--text-label);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
}

.indicador .punto {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--line-strong);
}

.indicador.pendiente {
  color: var(--gold-light);
  border-color: var(--gold);
  background: var(--gold-tint);
}

.indicador.pendiente .punto {
  background: var(--gold);
}

.usuario {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.correo {
  font-size: var(--text-label);
  color: var(--muted);
}

/* ── Barra lateral ── */
.nav {
  grid-area: nav;
  position: sticky;
  top: 64px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--line);
}

.nav > * {
  /* Con alto limitado, los grupos se desplazan en vez de encogerse. */
  flex-shrink: 0;
}

.grupo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.grupo.separado {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.titulo-grupo {
  margin-top: var(--space-3);
  padding: 0 var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--faint);
}

.nav a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-soft);
}

.nav a:hover {
  background: var(--surface);
  color: var(--text);
}

.nav a.activo {
  background: var(--gold-tint);
  color: var(--gold-light);
}

.marca-cambio {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--gold);
}

.usuario-movil {
  display: none;
}

/* ── Contenido ── */
.principal {
  grid-area: principal;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
  padding: var(--space-8) var(--gutter) var(--space-16);
}

.principal:focus {
  outline: none;
}

.principal :deep(h1) {
  font-size: var(--text-4xl);
  font-weight: 600;
}

.principal :deep(h1:focus) {
  outline: none;
}

/* ── Móvil: la barra lateral pasa a ser un menú ── */
@media (max-width: 767px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      'barra'
      'principal';
  }

  .barra {
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
  }

  .btn-menu {
    display: inline-flex;
  }

  .marca span {
    display: none;
  }

  .indicador {
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
  }

  .usuario {
    display: none;
  }

  .nav {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    /* Sin el "start" de escritorio: en un elemento fijo, Chrome lo usaría para alinear la caja
       (alto del contenido, empujada hacia arriba) en vez de ocupar de top a bottom. */
    align-self: stretch;
    z-index: 15;
    display: none;
    max-height: none;
    background: var(--bg);
    border-right: 0;
  }

  .nav.abierto {
    display: flex;
  }

  .usuario-movil {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding: var(--space-4) var(--space-3) 0;
    border-top: 1px solid var(--line);
  }

  .principal {
    padding: var(--space-6) var(--space-4) var(--space-12);
  }
}
</style>
