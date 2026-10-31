/**
 * Editores de T19 contra los emuladores (npm run test:e2e): slug y orden de
 * proyectos, plantilla de WhatsApp (marcadores, validación y vista previa),
 * íconos, etiquetas, visibilidad de Producto y largo recomendado del SEO.
 */
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';
import { db, entrar, json, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const t = textos.bloquesEditor;
const lista = textos.campos.lista;

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

// Cada prueba empieza con todos los bloques publicados y al día (version 1).
test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const d = db();
  const ahora = Timestamp.now();
  await Promise.all(
    NOMBRES_BLOQUES.flatMap((nombre) => [
      d.doc(`borradores/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
      d.doc(`publicado/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
    ]),
  );
});

type Proyecto = { slug: string; titulo: string; orden: number; visible: boolean; stack: string[] };
const borrador = async (bloque: string) => (await db().doc(`borradores/${bloque}`).get()).data()!;
const estado = (page: Page) => page.getByRole('status').filter({ hasText: /Sin cambios|Cambios sin guardar|Guardando|Guardado/ });
const guardar = (page: Page) => page.getByRole('button', { name: textos.editor.guardar, exact: true });

async function abrir(page: Page, bloque: string) {
  await entrar(page, undefined, undefined, `/admin#/contenido/${bloque}`);
  await expect(titulo(page)).toHaveText(textos.bloques[bloque as keyof typeof textos.bloques]);
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
}

test.describe('proyectos', () => {
  const proyectos = (page: Page) => page.getByRole('group', { name: t.proyectos.items });
  // Solo los proyectos (las etiquetas del stack también son <li>).
  const items = (page: Page) => proyectos(page).locator(':scope > ol > li');
  const item = (page: Page, i: number) => items(page).nth(i);

  test('el slug sigue al título hasta que se edita a mano, y nunca se repite', async ({ page }) => {
    await abrir(page, 'proyectos');
    await proyectos(page).getByRole('button', { name: lista.agregar(t.proyectos.item) }).click();
    const nuevo = item(page, 4);
    const tituloCampo = nuevo.getByLabel(t.proyectos.titulo, { exact: true });
    const slug = nuevo.getByLabel(t.proyectos.slug);
    await expect(tituloCampo).toBeFocused();
    await expect(nuevo.getByRole('switch', { name: t.proyectos.visible })).not.toBeChecked(); // nuevos, ocultos

    await page.keyboard.type('Tienda Ñandú & Café');
    await expect(slug).toHaveValue('tienda-nandu-cafe');

    // Un título que daría un slug existente recibe sufijo.
    await tituloCampo.fill('WP Producciones');
    await expect(slug).toHaveValue('wp-producciones-2');
    await tituloCampo.fill('Tienda online');
    await expect(slug).toHaveValue('tienda-online');

    // Editado a mano: ya no sigue al título.
    await slug.fill('mi-tienda');
    await tituloCampo.fill('Tienda online de café');
    await expect(slug).toHaveValue('mi-tienda');

    // A mano sí se puede repetir… pero el schema no deja guardar.
    await slug.fill('startup');
    await slug.blur();
    await expect(nuevo.getByText('Ya hay otro proyecto con este slug')).toBeVisible();
    await nuevo.getByLabel(t.proyectos.etiqueta).fill('Tienda');
    await nuevo.getByLabel(t.proyectos.resumen).fill('Venta de café en línea.');
    await guardar(page).click();
    await expect(slug).toBeFocused();
    expect((await borrador('proyectos')).version).toBe(1);

    await slug.fill('tienda-cafe');
    await guardar(page).click();
    await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
    const guardado = (await borrador('proyectos')).items.at(-1) as Proyecto;
    expect(guardado).toMatchObject({ slug: 'tienda-cafe', titulo: 'Tienda online de café', visible: false, orden: 5 });
  });

  test('el orden se maneja con subir y bajar, sin números, y se guarda como 1, 2, 3…', async ({ page }) => {
    // En Firestore, desordenados y con huecos: el editor los muestra por `orden`.
    const desordenados = (json('proyectos').items as Proyecto[]).map((p, i) => ({ ...p, orden: (i + 1) * 10 })).reverse();
    await db().doc('borradores/proyectos').update({ items: desordenados });
    await abrir(page, 'proyectos');
    await expect(items(page)).toHaveCount(4);
    await expect(item(page, 0).getByLabel(t.proyectos.titulo, { exact: true })).toHaveValue('WP Producciones');
    await expect(page.getByLabel(/orden/i)).toHaveCount(0);

    await proyectos(page).getByRole('button', { name: lista.subir('proyecto 3') }).click();
    await expect(item(page, 1).getByLabel(t.proyectos.titulo, { exact: true })).toHaveValue('StartUP!');

    // Ocultar un proyecto desde su tarjeta.
    await item(page, 3).getByRole('switch', { name: t.proyectos.visible }).uncheck();

    await guardar(page).click();
    await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
    const guardados = (await borrador('proyectos')).items as Proyecto[];
    expect(guardados.map((p) => [p.slug, p.orden, p.visible])).toEqual([
      ['wp-producciones', 1, true],
      ['startup', 2, true],
      ['wp-facturacion', 3, true],
      ['pets', 4, false],
    ]);

    await page.reload();
    await expect(item(page, 1).getByLabel(t.proyectos.titulo, { exact: true })).toHaveValue('StartUP!');
    await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
  });

  test('el stack se edita como etiquetas', async ({ page }) => {
    await abrir(page, 'proyectos');
    const stack = item(page, 1).getByRole('group', { name: t.proyectos.stack });
    const nueva = stack.getByLabel(textos.etiquetas.agregar(t.proyectos.stackElemento));
    await nueva.fill('Kotlin');
    await nueva.press('Enter');
    await nueva.fill('java');
    await nueva.press('Enter');
    await expect(stack.getByText(textos.etiquetas.repetida('java'))).toBeVisible();
    await stack.getByRole('button', { name: textos.etiquetas.quitar('ESC/POS') }).click();
    await expect(stack.getByRole('button', { name: textos.etiquetas.quitar('Kotlin') })).toBeFocused();

    await guardar(page).click();
    await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
    expect(((await borrador('proyectos')).items as Proyecto[])[1].stack).toEqual(['Java', 'Firebase', 'Kotlin']);
  });
});

test.describe('plantilla de WhatsApp', () => {
  const plantilla = (page: Page) => page.getByLabel(t.cotizador.plantilla);
  const vista = (page: Page) => page.locator('[data-vista-previa]');

  test('vista previa en vivo con buildQuoteMessage y datos de ejemplo', async ({ page }) => {
    await abrir(page, 'cotizador');
    const cotizador = json<{ tipos: { label: string }[] }>('cotizador');
    await expect(vista(page)).toContainText(`Ref: ${t.cotizador.ejemplo.ref}`);
    await expect(vista(page)).toContainText(`Tipo: ${cotizador.tipos[0].label}`);
    await expect(vista(page).locator('strong').first()).toHaveText('Ref:'); // *Ref:* en negrita
    await expect(vista(page)).not.toContainText('*');

    // Cambia la primera opción de tipo: la vista previa la usa al momento.
    const tipos = page.getByRole('group', { name: t.cotizador.tipos });
    await tipos.getByRole('listitem').first().getByLabel(t.cotizador.tipoLabel).fill('Tienda con delivery');
    await expect(vista(page)).toContainText('Tipo: Tienda con delivery');

    // Las opciones tienen contador por el máximo del schema.
    await expect(tipos.getByRole('listitem').first().getByText('19 / 120')).toBeVisible();

    // Una línea cuyo dato queda vacío no se envía.
    await plantilla(page).fill('Hola\n*Ref:* {ref}\n*Teléfono:* {negocio}');
    await expect(vista(page)).toContainText(`Teléfono: ${t.cotizador.ejemplo.negocio}`);
    await plantilla(page).fill('Hola {nombre}');
    await expect(vista(page)).toHaveText(`Hola ${t.cotizador.ejemplo.nombre}`);
  });

  test('los botones insertan el marcador donde está el cursor', async ({ page }) => {
    await abrir(page, 'cotizador');
    await plantilla(page).fill('Hola , gracias');
    await plantilla(page).evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 5));
    await page.getByRole('button', { name: t.cotizador.insertar('nombre') }).click();
    await expect(plantilla(page)).toHaveValue('Hola {nombre}, gracias');
    await expect(plantilla(page)).toBeFocused();
    expect(await plantilla(page).evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(13);
    await expect(vista(page)).toHaveText(`Hola ${t.cotizador.ejemplo.nombre}, gracias`);
  });

  test('un marcador que no existe se avisa al escribirlo y no deja guardar', async ({ page }) => {
    await abrir(page, 'cotizador');
    await plantilla(page).fill('Hola {nombre}, tu teléfono es {telefono}');
    // Sin salir del campo: el aviso aparece al escribir.
    await expect(plantilla(page)).toBeFocused();
    await expect(page.getByText(t.cotizador.desconocidos('{telefono}'))).toBeVisible();
    await expect(plantilla(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(vista(page)).toContainText('{telefono}'); // se enviaría tal cual

    await guardar(page).click();
    await expect(page.getByText(textos.editor.invalido(1))).toBeVisible();
    await expect(plantilla(page)).toBeFocused();
    expect((await borrador('cotizador')).version).toBe(1);

    await plantilla(page).fill('Hola {nombre}');
    await expect(page.getByText(t.cotizador.desconocidos('{telefono}'))).toHaveCount(0);
    await guardar(page).click();
    await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
    expect((await borrador('cotizador')).plantillaWhatsapp).toBe('Hola {nombre}');
  });
});

test('servicios: el ícono se elige con vista previa (también con flechas)', async ({ page }) => {
  await abrir(page, 'servicios');
  const primero = page.getByRole('group', { name: t.servicios.items }).getByRole('listitem').first();
  const iconos = primero.getByRole('group', { name: t.servicios.icono });
  await expect(iconos.getByRole('radio', { name: textos.iconos.web })).toBeChecked();
  await expect(iconos.locator('svg')).toHaveCount(Object.keys(textos.iconos).length);

  await iconos.getByRole('radio', { name: textos.iconos.web }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(iconos.getByRole('radio', { name: textos.iconos.android })).toBeChecked();
  await iconos.getByRole('radio', { name: textos.iconos.shield }).check();

  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
  expect(((await borrador('servicios')).items as { icono: string }[])[0].icono).toBe('shield');
});

test('producto: el interruptor visible va arriba y, apagado, avisa que no se muestra', async ({ page }) => {
  await abrir(page, 'producto');
  const interruptor = page.getByRole('switch', { name: t.producto.visible });
  await expect(interruptor).not.toBeChecked(); // producto.json: visible false
  await expect(page.getByText(t.producto.oculta)).toBeVisible();
  // Es lo primero del formulario.
  const primerCampo = await page.locator('form :is(input, textarea, select)').first().getAttribute('id');
  expect(primerCampo).toBe(await interruptor.getAttribute('id'));

  await interruptor.check();
  await expect(page.getByText(t.producto.oculta)).toHaveCount(0);
});

test('nosotros: tecnologías como etiquetas y foto con su texto alternativo', async ({ page }) => {
  await db().doc('borradores/nosotros').update({ foto: { src: 'apple-touch-icon.png', alt: 'Fernando', width: 180, height: 180 } });
  await abrir(page, 'nosotros');
  const foto = page.getByRole('group', { name: new RegExp(`^${t.nosotros.foto}`) });
  await expect(foto.getByRole('img', { name: 'Fernando' })).toBeVisible();
  await foto.getByLabel(textos.campos.imagen.alt).fill('Fernando Martínez');

  const tecnologias = page.getByRole('group', { name: t.nosotros.tecnologias });
  await tecnologias.getByLabel(textos.etiquetas.agregar(t.nosotros.tecnologia)).fill('Astro');
  await tecnologias.getByRole('button', { name: textos.etiquetas.boton }).click();

  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
  const guardado = await borrador('nosotros');
  expect(guardado.foto.alt).toBe('Fernando Martínez');
  expect(guardado.tecnologias.at(-1)).toBe('Astro');
});

test('SEO: pasar el largo recomendado avisa sin impedir guardar; pasar el máximo sí lo impide', async ({ page }) => {
  await abrir(page, 'site');
  const descripcion = page.getByLabel(textos.editores.site.seoDescripcion);
  // La descripción actual (157) ya pasa el recomendado (155), no el máximo (170).
  await expect(page.getByText(textos.campos.sobreRecomendado)).toBeVisible();
  await descripcion.fill(`${await descripcion.inputValue()} `.repeat(1).trimEnd() + ' Más.');
  await expect(descripcion).not.toHaveAttribute('aria-invalid', 'true');
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));

  await descripcion.fill('x'.repeat(171));
  await descripcion.blur();
  await expect(page.getByText(textos.errores.maxCaracteres(170))).toBeVisible();
  await guardar(page).click();
  await expect(descripcion).toBeFocused();
  expect((await borrador('site')).version).toBe(2);
});

test.describe('a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('ningún editor se desborda', async ({ page }) => {
    await abrir(page, 'site');
    for (const nombre of NOMBRES_BLOQUES) {
      await page.goto(`/admin#/contenido/${nombre}`);
      await expect(titulo(page)).toHaveText(textos.bloques[nombre]);
      await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho, `ancho del editor de ${nombre}`).toBeLessThanOrEqual(390);
    }

    // En la cabecera de un proyecto, el interruptor no se encima con los botones.
    await page.goto('/admin#/contenido/proyectos');
    const proyecto = page.getByRole('group', { name: t.proyectos.items }).locator(':scope > ol > li').first();
    const interruptor = (await proyecto.locator('.cabecera label').boundingBox())!;
    const bajar = (await proyecto.getByRole('button', { name: lista.bajar('proyecto 1') }).boundingBox())!;
    const seEnciman =
      interruptor.x < bajar.x + bajar.width && bajar.x < interruptor.x + interruptor.width &&
      interruptor.y < bajar.y + bajar.height && bajar.y < interruptor.y + interruptor.height;
    expect(seEnciman).toBe(false);
  });
});
