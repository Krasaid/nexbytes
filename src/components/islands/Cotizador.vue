<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { isEmail, submitQuote, type QuoteRequest } from '../../lib/forms';
import type { Cotizador } from '../../lib/schemas';

const props = defineProps<{
  cotizador: Cotizador;
  /** Link de WhatsApp del resumen (wa.me o ancla de contacto). */
  whatsappHref: string;
}>();

const c = props.cotizador;
const total = c.pasos.length;
const ultimo = total - 1;

// Índices de los pasos (el schema fija 5).
const TIPO = 0;
const FUNCIONES = 1;
const PLAZO = 2;
const PRESUPUESTO = 3;

const step = ref(0);
const sending = ref(false);
const sent = ref(false);
const stepError = ref(false);

const form = reactive<QuoteRequest>({
  tipo: '',
  funciones: [],
  plazo: '',
  presupuesto: '',
  nombre: '',
  empresa: '',
  correo: '',
  whatsapp: '',
  descripcion: '',
});

const fieldErrors = reactive({ nombre: false, contacto: false, correo: false });

const stepTitle = ref<HTMLElement | null>(null);
const successTitle = ref<HTMLElement | null>(null);

const paso = computed(() => c.pasos[step.value]);
const progreso = computed(() =>
  c.progreso.replace('{actual}', String(step.value + 1)).replace('{total}', String(total)),
);

/** Opciones de selección única del paso actual y el campo que llenan. */
const single = computed(() => {
  if (step.value === TIPO) return { key: 'tipo' as const, options: c.tipos };
  if (step.value === PLAZO) return { key: 'plazo' as const, options: c.plazos.map((label) => ({ label, hint: '' })) };
  if (step.value === PRESUPUESTO)
    return { key: 'presupuesto' as const, options: c.presupuestos.map((label) => ({ label, hint: '' })) };
  return null;
});

function pick(key: 'tipo' | 'plazo' | 'presupuesto', label: string) {
  form[key] = label;
  stepError.value = false;
}

function toggleFuncion(label: string) {
  const i = form.funciones.indexOf(label);
  if (i >= 0) form.funciones.splice(i, 1);
  else form.funciones.push(label);
}

function validarContacto(): boolean {
  const correo = form.correo.trim();
  fieldErrors.nombre = !form.nombre.trim();
  fieldErrors.contacto = !correo && !form.whatsapp.trim();
  fieldErrors.correo = !!correo && !isEmail(correo);
  return !fieldErrors.nombre && !fieldErrors.contacto && !fieldErrors.correo;
}

function primerCampoConError(): string | null {
  if (fieldErrors.nombre) return 'q-nombre';
  if (fieldErrors.contacto || fieldErrors.correo) return 'q-correo';
  return null;
}

async function irA(n: number) {
  step.value = n;
  stepError.value = false;
  await nextTick();
  stepTitle.value?.focus();
}

async function onPrimary() {
  if (step.value < ultimo) {
    const s = single.value;
    if (s && !form[s.key]) {
      stepError.value = true;
      return;
    }
    await irA(step.value + 1);
    return;
  }

  if (!validarContacto()) {
    const id = primerCampoConError();
    if (id) document.getElementById(id)?.focus();
    return;
  }

  sending.value = true;
  try {
    await submitQuote({
      ...form,
      funciones: [...form.funciones],
      nombre: form.nombre.trim(),
      empresa: form.empresa.trim(),
      correo: form.correo.trim(),
      whatsapp: form.whatsapp.trim(),
      descripcion: form.descripcion.trim(),
    });
    sent.value = true;
    await nextTick();
    successTitle.value?.focus();
  } finally {
    sending.value = false;
  }
}

async function reset() {
  Object.assign(form, {
    tipo: '',
    funciones: [],
    plazo: '',
    presupuesto: '',
    nombre: '',
    empresa: '',
    correo: '',
    whatsapp: '',
    descripcion: '',
  });
  Object.assign(fieldErrors, { nombre: false, contacto: false, correo: false });
  sent.value = false;
  await irA(0);
}

const resumen = computed(() => [
  { dt: c.resumen.proyecto, dd: form.tipo || c.resumen.vacio },
  { dt: c.resumen.funciones, dd: form.funciones.length ? form.funciones.join(', ') : c.resumen.vacio },
  { dt: c.resumen.plazo, dd: form.plazo || c.resumen.vacio },
  { dt: c.resumen.presupuesto, dd: form.presupuesto || c.resumen.vacio },
]);

const campos = [
  { key: 'nombre', id: 'q-nombre', type: 'text', autocomplete: 'name' },
  { key: 'empresa', id: 'q-empresa', type: 'text', autocomplete: 'organization' },
  { key: 'correo', id: 'q-correo', type: 'email', autocomplete: 'email' },
  { key: 'whatsapp', id: 'q-wa', type: 'tel', autocomplete: 'tel' },
] as const;

function errorDeCampo(key: (typeof campos)[number]['key']): string | null {
  if (key === 'nombre' && fieldErrors.nombre) return c.errores.nombre;
  if (key === 'correo' && fieldErrors.correo) return c.errores.correo;
  if ((key === 'correo' || key === 'whatsapp') && fieldErrors.contacto) return c.errores.contacto;
  return null;
}
</script>

<template>
  <div class="cotizador">
    <div class="panel">
      <form v-if="!sent" class="wizard" novalidate @submit.prevent="onPrimary">
        <ol role="list" aria-label="Pasos" class="steps">
          <li
            v-for="(p, i) in c.pasos"
            :key="p.nombre"
            :class="{ done: i <= step, current: i === step }"
            :aria-current="i === step ? 'step' : undefined"
          >
            <span class="bar" aria-hidden="true"></span>
            <span class="step-name">{{ p.nombre }}</span>
          </li>
        </ol>

        <div class="step">
          <div class="step-head">
            <h3 id="cotizador-paso" ref="stepTitle" tabindex="-1">{{ paso.titulo }}</h3>
            <p v-if="paso.ayuda" class="ayuda">{{ paso.ayuda }}</p>
          </div>

          <!-- Tipo, plazo y presupuesto: selección única -->
          <div v-if="single" class="options" role="group" aria-labelledby="cotizador-paso">
            <button
              v-for="o in single.options"
              :key="o.label"
              type="button"
              class="option"
              :class="{ tall: o.hint }"
              :aria-pressed="form[single.key] === o.label"
              @click="pick(single.key, o.label)"
            >
              <span class="option-label">{{ o.label }}</span>
              <span v-if="o.hint" class="option-hint">{{ o.hint }}</span>
            </button>
          </div>

          <!-- Funciones: selección múltiple -->
          <div v-else-if="step === FUNCIONES" class="options" role="group" aria-labelledby="cotizador-paso">
            <button
              v-for="f in c.funciones"
              :key="f"
              type="button"
              class="option check"
              :aria-pressed="form.funciones.includes(f)"
              @click="toggleFuncion(f)"
            >
              <span class="box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </span>
              {{ f }}
            </button>
          </div>

          <!-- Contacto -->
          <div v-else class="fields">
            <div class="grid-fields">
              <div v-for="campo in campos" :key="campo.key" class="field">
                <label :for="campo.id">{{ c.campos[campo.key].label }}</label>
                <input
                  :id="campo.id"
                  v-model="form[campo.key]"
                  :type="campo.type"
                  :name="campo.key"
                  :autocomplete="campo.autocomplete"
                  :placeholder="c.campos[campo.key].placeholder"
                  :aria-invalid="errorDeCampo(campo.key) ? 'true' : undefined"
                  :aria-describedby="errorDeCampo(campo.key) ? `${campo.id}-error` : undefined"
                />
                <p v-if="errorDeCampo(campo.key)" :id="`${campo.id}-error`" class="error">
                  {{ errorDeCampo(campo.key) }}
                </p>
              </div>
            </div>
            <div class="field">
              <label for="q-desc">{{ c.campos.descripcion.label }}</label>
              <textarea
                id="q-desc"
                v-model="form.descripcion"
                name="descripcion"
                rows="4"
                :placeholder="c.campos.descripcion.placeholder"
              ></textarea>
            </div>
          </div>

          <p v-if="stepError" class="error" role="alert">{{ c.errores.elegir }}</p>
        </div>

        <div class="actions">
          <button v-if="step > 0" type="button" class="btn ghost" :disabled="sending" @click="irA(step - 1)">
            {{ c.botones.atras }}
          </button>
          <span v-else class="progreso">{{ progreso }}</span>

          <button type="submit" class="btn primary" :disabled="sending">
            <template v-if="step < ultimo">{{ c.botones.siguiente }}</template>
            <template v-else>{{ sending ? c.botones.enviando : c.botones.enviar }}</template>
          </button>
        </div>
      </form>

      <div v-else class="exito">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M7 12.5l3.2 3.2L17 9" />
        </svg>
        <h3 ref="successTitle" tabindex="-1">{{ c.exito.titulo }}</h3>
        <p>{{ c.exito.texto }}</p>
        <button type="button" class="btn ghost" @click="reset">{{ c.botones.otro }}</button>
      </div>
    </div>

    <aside class="resumen" aria-labelledby="cotizador-resumen">
      <h3 id="cotizador-resumen" class="resumen-titulo">{{ c.resumen.titulo }}</h3>
      <dl aria-live="polite">
        <div v-for="item in resumen" :key="item.dt">
          <dt>{{ item.dt }}</dt>
          <dd>{{ item.dd }}</dd>
        </div>
      </dl>
      <p class="contacto">
        {{ c.resumen.contactoTexto }} <a :href="props.whatsappHref">{{ c.resumen.contactoLink }}</a>.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.cotizador {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-5);
}

/* ── Panel del formulario ── */
.panel {
  flex: 999 1 560px;
  min-width: 0;
  padding: clamp(22px, 4vw, 36px);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
}

.wizard {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
}

.steps li {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.bar {
  height: 3px;
  border-radius: 2px;
  background: var(--line);
  transition: background-color var(--transition-base);
}

.done .bar {
  background: var(--gold);
}

.step-name {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--faint);
}

.done .step-name {
  color: var(--text-soft);
}

.current .step-name {
  color: var(--gold);
}

.step {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.step-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-head h3 {
  font-size: var(--text-3xl);
  line-height: 1.25;
}

.step-head h3:focus {
  outline: none;
}

.step-head h3:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 4px;
}

.ayuda {
  font-size: var(--text-md);
  color: var(--muted);
}

/* ── Opciones ── */
.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 10px;
}

.option {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-1);
  min-height: 56px;
  padding: var(--space-4) 18px;
  text-align: left;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  color: var(--text-option);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.option:hover {
  border-color: var(--line-strong);
}

.option[aria-pressed='true'] {
  background: var(--gold-tint);
  border-color: var(--gold);
  color: var(--text);
}

.option.tall .option-label {
  font-weight: 600;
}

.option-hint {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--muted);
}

.option.check {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
  min-height: 52px;
  padding-block: 14px;
  font-size: var(--text-md);
  font-weight: 400;
}

.box {
  display: grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  border: 1px solid var(--line-check);
  border-radius: 4px;
  color: transparent;
}

.option[aria-pressed='true'] .box {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
}

/* ── Campos ── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.grid-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  font-size: var(--text-label);
  color: var(--text-soft);
}

.error {
  font-size: var(--text-label);
  color: var(--gold-light);
}

/* ── Acciones ── */
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding-top: 22px;
  border-top: 1px solid var(--line);
}

.progreso {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--faint);
}

.btn {
  min-height: 48px;
  padding: 14px 22px;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.btn.primary {
  margin-left: auto;
  padding-inline: 26px;
  background: var(--gold);
  color: var(--on-gold);
  border: 0;
  font-weight: 600;
}

.btn.primary:hover {
  background: var(--gold-light);
}

.btn.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--line-strong);
}

.btn.ghost:hover {
  border-color: var(--gold);
}

.btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* ── Éxito ── */
.exito {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  padding-block: var(--space-6);
  color: var(--gold);
}

.exito h3 {
  font-size: var(--text-4xl);
  color: var(--text);
}

.exito h3:focus {
  outline: none;
}

.exito p {
  max-width: 520px;
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--muted);
}

/* ── Resumen ── */
.resumen {
  flex: 1 1 300px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-7);
  background: var(--bg);
  border: 1px solid var(--gold);
  border-radius: var(--radius-xl);
}

.resumen-titulo {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 400;
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--gold);
}

dl {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

dl div {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

dl div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

dt {
  font-size: var(--text-sm);
  color: var(--faint);
}

dd {
  margin: 0;
  font-size: var(--text-base);
  line-height: 1.5;
}

.contacto {
  font-size: var(--text-label);
  line-height: 1.55;
  color: var(--muted);
}

.contacto a {
  color: var(--gold);
}
</style>
