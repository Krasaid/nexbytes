<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { buildQuoteMessage, MARCADORES, marcadoresDesconocidos, type QuoteMessageData } from '../../lib/whatsapp';
import CampoBase from '../fields/CampoBase.vue';
import { useCampo } from '../formulario';
import { textos } from '../textos';

// plantillaWhatsapp del cotizador: botones que insertan cada marcador donde
// está el cursor, aviso en vivo de marcadores que no existen (el schema además
// impide guardarlos) y vista previa con buildQuoteMessage, la misma función de la landing.
const t = textos.bloquesEditor.cotizador;
const RUTA = 'plantillaWhatsapp';

const { id, valor, error, limites, tocar } = useCampo(RUTA);
const tipos = useCampo('tipos');
const funciones = useCampo('funciones');
const plazos = useCampo('plazos');
const presupuestos = useCampo('presupuestos');

const texto = computed({
  get: () => (typeof valor.value === 'string' ? valor.value : ''),
  set: (v: string) => (valor.value = v),
});
const desconocidos = computed(() => marcadoresDesconocidos(texto.value));
// Un marcador inexistente se avisa al escribirlo, sin esperar a salir del campo.
const errorMostrado = computed(() =>
  desconocidos.value.length ? t.desconocidos(desconocidos.value.map(marca).join(', ')) : error.value,
);

const area = ref<HTMLTextAreaElement | null>(null);

/** "nombre" → "{nombre}" (en una función: `}}` dentro del template cerraría la interpolación). */
const marca = (m: string) => `{${m}}`;

async function insertar(marcador: string) {
  const el = area.value;
  const inicio = el?.selectionStart ?? texto.value.length;
  const fin = el?.selectionEnd ?? inicio;
  const insertado = marca(marcador);
  texto.value = texto.value.slice(0, inicio) + insertado + texto.value.slice(fin);
  tocar();
  await nextTick();
  el?.focus();
  el?.setSelectionRange(inicio + insertado.length, inicio + insertado.length);
}

// Datos de ejemplo: las primeras opciones del propio cotizador y un cliente ficticio.
const primero = <T,>(lista: unknown): T | undefined => (Array.isArray(lista) ? (lista[0] as T) : undefined);
const ejemplo = computed<QuoteMessageData>(() => ({
  ref: t.ejemplo.ref,
  tipo: primero<{ label?: string }>(tipos.valor.value)?.label ?? '',
  funciones: Array.isArray(funciones.valor.value) ? (funciones.valor.value as string[]).slice(0, 2) : [],
  plazo: primero<string>(plazos.valor.value) ?? '',
  presupuesto: primero<string>(presupuestos.valor.value) ?? '',
  nombre: t.ejemplo.nombre,
  negocio: t.ejemplo.negocio,
  idea: t.ejemplo.idea,
}));

/** Líneas del mensaje, con *texto* en negrita como lo muestra WhatsApp (sin v-html). */
const vista = computed(() =>
  buildQuoteMessage(texto.value, ejemplo.value)
    .split('\n')
    .map((linea) =>
      linea.split(/(\*[^*\n]+\*)/).filter(Boolean).map((parte) =>
        /^\*[^*\n]+\*$/.test(parte) ? { texto: parte.slice(1, -1), negrita: true } : { texto: parte, negrita: false },
      ),
    ),
);
</script>

<template>
  <div class="plantilla ancho">
    <CampoBase
      v-slot="{ describedby }"
      :id="id"
      :etiqueta="t.plantilla"
      :ayuda="t.plantillaAyuda"
      :error="errorMostrado"
      :limites="limites"
    >
      <textarea
        :id="id"
        ref="area"
        v-model="texto"
        rows="12"
        spellcheck="false"
        :aria-invalid="errorMostrado ? 'true' : undefined"
        :aria-describedby="describedby"
        @blur="tocar"
      ></textarea>
    </CampoBase>

    <div class="marcadores" role="group" aria-labelledby="plantilla-marcadores">
      <p id="plantilla-marcadores" class="subtitulo">
        {{ t.marcadores }} <span class="tenue">· {{ t.marcadoresAyuda }}</span>
      </p>
      <div class="botones">
        <button
          v-for="m in MARCADORES"
          :key="m"
          type="button"
          class="marcador"
          :aria-label="t.insertar(m)"
          @click="insertar(m)"
        >
          {{ marca(m) }}
        </button>
      </div>
    </div>

    <section class="vista" aria-labelledby="plantilla-vista">
      <h3 id="plantilla-vista" class="subtitulo">{{ t.vistaPrevia }}</h3>
      <div class="burbuja" data-vista-previa>
        <p v-for="(linea, i) in vista" :key="i" class="linea">
          <template v-for="(parte, j) in linea" :key="j">
            <strong v-if="parte.negrita">{{ parte.texto }}</strong>
            <template v-else>{{ parte.texto }}</template>
          </template>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.plantilla {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
}

.plantilla > :first-child,
.marcadores {
  grid-column: 1;
}

.vista {
  grid-column: 2;
  grid-row: 1 / span 2;
}

textarea {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.subtitulo {
  margin-bottom: var(--space-2);
  font-size: var(--text-label);
  font-weight: 400;
  color: var(--text-soft);
}

.tenue {
  color: var(--muted);
}

.botones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.marcador {
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--gold-light);
  cursor: pointer;
}

.marcador:hover {
  border-color: var(--gold);
}

.burbuja {
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--text-soft);
  overflow-wrap: anywhere;
}

/* Las líneas vacías del mensaje se ven como separación. */
.linea {
  min-height: 1.5em;
}

strong {
  color: var(--text);
}

@media (max-width: 900px) {
  .plantilla {
    grid-template-columns: minmax(0, 1fr);
  }

  .plantilla > :first-child,
  .marcadores,
  .vista {
    grid-column: 1;
    grid-row: auto;
  }
}
</style>
