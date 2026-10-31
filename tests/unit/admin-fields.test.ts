// @vitest-environment happy-dom
/**
 * Campos del admin en aislamiento: lo que Sitio y Hero no ejercitan (contador
 * de caracteres, interruptor, opciones del select) y lo común a todos
 * (etiqueta, aria-invalid, error debajo, opcional vacío).
 * Los flujos completos (listas, imagen, guardar) están en tests/e2e/editores.spec.ts.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, type Component } from 'vue';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { crearFormulario, proveerFormulario, type Formulario } from '../../src/admin/formulario';
import SelectField from '../../src/admin/fields/SelectField.vue';
import TextArea from '../../src/admin/fields/TextArea.vue';
import TextField from '../../src/admin/fields/TextField.vue';
import ToggleField from '../../src/admin/fields/ToggleField.vue';
import { textos } from '../../src/admin/textos';

const schema = z.object({
  titulo: z.string().trim().min(1).max(10),
  nota: z.string().max(20).optional(),
  region: z.string().trim().min(1).optional(),
  visible: z.boolean(),
  pais: z.string().regex(/^[A-Z]{2}$/),
});

/** Monta un campo dentro de un formulario con `datos`; devuelve el wrapper y el formulario. */
function montar(campo: Component, props: Record<string, unknown>, datos: Record<string, unknown>) {
  let formulario!: Formulario;
  const Envoltorio = defineComponent({
    setup() {
      formulario = crearFormulario(schema, ref(datos));
      proveerFormulario(formulario);
      return () => h(campo, props);
    },
  });
  return { wrapper: mount(Envoltorio, { attachTo: document.body }), formulario: () => formulario };
}

describe('TextField', () => {
  it('tiene etiqueta asociada y muestra el contador cuando el schema tiene máximo', async () => {
    const { wrapper } = montar(TextField, { ruta: 'titulo', etiqueta: 'Título' }, { titulo: 'Hola' });
    const input = wrapper.get('input');
    expect(wrapper.get(`label[for="${input.attributes('id')}"]`).text()).toBe('Título');
    expect(wrapper.text()).toContain(textos.campos.contador(4, 10));
    expect(input.attributes('aria-describedby')).toContain('-contador');

    await input.setValue('Hola mundo, demasiado largo');
    expect(wrapper.get('.contador').classes()).toContain('excedido');
  });

  it('el error se ve al salir del campo, con aria-invalid y debajo del campo', async () => {
    const { wrapper } = montar(TextField, { ruta: 'titulo', etiqueta: 'Título' }, { titulo: 'Hola' });
    const input = wrapper.get('input');
    await input.setValue('');
    expect(input.attributes('aria-invalid')).toBeUndefined(); // todavía no se tocó

    await input.trigger('blur');
    expect(input.attributes('aria-invalid')).toBe('true');
    const error = wrapper.get('.error');
    expect(error.text()).toBe(textos.errores.obligatorio);
    expect(input.attributes('aria-describedby')).toContain(error.attributes('id'));
  });

  it('un opcional vacío se quita del documento en vez de quedar como ""', async () => {
    const { wrapper, formulario } = montar(TextField, { ruta: 'region', etiqueta: 'Región' }, { region: 'Santa Ana' });
    expect(wrapper.text()).toContain(`(${textos.campos.opcional})`);
    await wrapper.get('input').setValue('');
    expect(formulario().datos.value).not.toHaveProperty('region');
  });

  it('sin máximo en el schema no hay contador', () => {
    const { wrapper } = montar(TextField, { ruta: 'region', etiqueta: 'Región' }, { region: 'x' });
    expect(wrapper.find('.contador').exists()).toBe(false);
  });
});

describe('TextArea', () => {
  it('cuenta caracteres igual que TextField', async () => {
    const { wrapper } = montar(TextArea, { ruta: 'nota', etiqueta: 'Nota' }, { nota: '' });
    await wrapper.get('textarea').setValue('doce letras!');
    expect(wrapper.text()).toContain(textos.campos.contador(12, 20));
  });
});

describe('ToggleField', () => {
  it('es un checkbox con role="switch" que escribe true/false', async () => {
    const { wrapper, formulario } = montar(ToggleField, { ruta: 'visible', etiqueta: 'Mostrar sección' }, { visible: false });
    const input = wrapper.get('input');
    expect(input.attributes('type')).toBe('checkbox');
    expect(input.attributes('role')).toBe('switch');
    expect(wrapper.get(`label[for="${input.attributes('id')}"]`).text()).toBe('Mostrar sección');

    await input.setValue(true);
    expect(formulario().datos.value.visible).toBe(true);
    await input.setValue(false);
    expect(formulario().datos.value.visible).toBe(false);
  });
});

describe('SelectField', () => {
  const opciones = [
    { valor: 'SV', etiqueta: 'El Salvador' },
    { valor: 'GT', etiqueta: 'Guatemala' },
  ];

  it('elige entre las opciones', async () => {
    const { wrapper, formulario } = montar(SelectField, { ruta: 'pais', etiqueta: 'País', opciones }, { pais: 'SV' });
    await wrapper.get('select').setValue('GT');
    expect(formulario().datos.value.pais).toBe('GT');
  });

  it('un valor guardado que no está en la lista se conserva como opción', () => {
    const { wrapper } = montar(SelectField, { ruta: 'pais', etiqueta: 'País', opciones }, { pais: 'CO' });
    const valores = wrapper.findAll('option').map((o) => o.attributes('value'));
    expect(valores).toEqual(['SV', 'GT', 'CO']);
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('CO');
  });
});
