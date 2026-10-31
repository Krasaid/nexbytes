/**
 * Editores de Sitio y Hero contra los emuladores (npm run test:e2e): cargar el
 * borrador, validar, listas, imagen, guardar con version + 1, avisos de cambios
 * sin guardar y conflicto con otra pestaña.
 */
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { db, entrar, json, nav, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const t = textos.editores;
const site = json('site');
const hero = json('hero');
const IMAGEN_OG = { src: 'apple-touch-icon.png', alt: 'Logo de Nexbytes', width: 180, height: 180 };

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

// Cada prueba empieza con site y hero publicados y al día.
test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const d = db();
  const ahora = Timestamp.now();
  const conImagen = { ...site, seo: { ...(site.seo as object), imagenOg: IMAGEN_OG } };
  await Promise.all([
    d.doc('borradores/site').set({ ...conImagen, version: 2, actualizadoEn: ahora }),
    d.doc('publicado/site').set({ ...conImagen, version: 2, actualizadoEn: ahora }),
    d.doc('borradores/hero').set({ ...hero, version: 5, actualizadoEn: ahora }),
    d.doc('publicado/hero').set({ ...hero, version: 5, actualizadoEn: ahora }),
  ]);
});

const borrador = async (bloque: string) => (await db().doc(`borradores/${bloque}`).get()).data()!;
const estado = (page: Page) => page.getByRole('status');
const guardar = (page: Page) => page.getByRole('button', { name: textos.editor.guardar, exact: true });
const dialogo = (page: Page) => page.getByRole('alertdialog');

async function abrir(page: Page, bloque: 'site' | 'hero') {
  await entrar(page, undefined, undefined, `/admin#/contenido/${bloque}`);
  await expect(titulo(page)).toHaveText(textos.bloques[bloque]);
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
}

test('carga el borrador, guarda con version + 1 y el bloque queda sin publicar', async ({ page }) => {
  await abrir(page, 'site');
  const nombre = page.getByLabel(t.site.nombre);
  await expect(nombre).toHaveValue('Nexbytes');
  await expect(guardar(page)).toBeDisabled();
  await expect(page.getByRole('link', { name: textos.shell.todoPublicado })).toBeVisible();

  await nombre.fill('  Nexbytes Studio  ');
  await expect(estado(page)).toHaveText(textos.editor.estado.sucio);
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(3));
  await expect(nombre).toHaveValue('Nexbytes Studio'); // lo guardado es la salida de zod (recortada)

  const guardado = await borrador('site');
  expect(guardado.version).toBe(3);
  expect(guardado.nombre).toBe('Nexbytes Studio');
  expect(guardado.actualizadoEn).toBeInstanceOf(Timestamp);
  expect(guardado.nav).toEqual(site.nav);

  await expect(page.getByRole('link', { name: textos.shell.sinPublicar(1), exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: `${textos.bloques.site} (${textos.shell.sinPublicar(1)})` })).toBeVisible();
  await expect(page.getByText(textos.editor.sinPublicar)).toBeVisible();
});

test('valida con el schema: el error se ve, el foco va al primer campo mal y no se guarda', async ({ page }) => {
  await abrir(page, 'site');
  const nombre = page.getByLabel(t.site.nombre);
  await nombre.fill('');
  await nombre.blur();
  await expect(nombre).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(textos.errores.obligatorio)).toBeVisible();

  // Una red con URL inválida (la lista de redes es opcional y empieza vacía).
  const redes = page.getByRole('group', { name: new RegExp(`^${t.site.redes}`) });
  await redes.getByRole('button', { name: textos.campos.lista.agregar(t.site.red) }).click();
  await expect(redes.getByLabel(t.site.redNombre)).toBeFocused();
  await redes.getByLabel(t.site.redNombre).fill('Instagram');
  await redes.getByLabel(t.site.redUrl).fill('instagram');

  await guardar(page).click();
  await expect(page.getByText(textos.editor.invalido(2))).toBeVisible();
  await expect(nombre).toBeFocused();
  await expect(redes.getByText(textos.errores.url)).toBeVisible();
  expect((await borrador('site')).version).toBe(2);

  await nombre.fill('Nexbytes');
  await redes.getByLabel(t.site.redUrl).fill('https://instagram.com/nexbytes');
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(3));
  expect((await borrador('site')).redes).toEqual([{ nombre: 'Instagram', url: 'https://instagram.com/nexbytes' }]);
});

test('listas: agregar, reordenar con teclado y quitar con confirmación', async ({ page }) => {
  await abrir(page, 'site');
  const menu = page.getByRole('group', { name: t.site.nav });
  const items = menu.getByRole('listitem');
  await expect(items).toHaveCount(4);
  await expect(menu.getByRole('button', { name: textos.campos.lista.subir('enlace 1') })).toBeDisabled();
  await expect(menu.getByRole('button', { name: textos.campos.lista.bajar('enlace 4') })).toBeDisabled();

  // Agregar: el foco va al primer campo del nuevo.
  await menu.getByRole('button', { name: textos.campos.lista.agregar(t.site.enlace) }).click();
  await expect(items).toHaveCount(5);
  await expect(items.nth(4).getByLabel(t.enlace.texto)).toBeFocused();
  await page.keyboard.type('Blog');
  await items.nth(4).getByLabel(t.enlace.destino).fill('/blog');

  // Subir con teclado: el foco sigue al elemento movido.
  await menu.getByRole('button', { name: textos.campos.lista.subir('enlace 5') }).focus();
  await page.keyboard.press('Enter');
  await expect(items.nth(3).getByLabel(t.enlace.texto)).toHaveValue('Blog');
  await expect(menu.getByRole('button', { name: textos.campos.lista.subir('enlace 4') })).toBeFocused();

  // Quitar pide confirmación; Escape cancela y el foco vuelve al botón.
  const quitar4 = menu.getByRole('button', { name: textos.campos.lista.quitar('enlace 4') });
  await quitar4.click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page)).toContainText(textos.confirmar.quitar.titulo('enlace 4'));
  await expect(dialogo(page).getByRole('button', { name: textos.confirmar.cancelar })).toBeFocused();
  const caja = (await dialogo(page).boundingBox())!;
  const ventana = page.viewportSize()!;
  expect(Math.abs(caja.x + caja.width / 2 - ventana.width / 2)).toBeLessThan(2); // centrado
  await page.keyboard.press('Escape');
  await expect(dialogo(page)).toBeHidden();
  await expect(items).toHaveCount(5);
  await expect(quitar4).toBeFocused();

  await quitar4.click();
  await dialogo(page).getByRole('button', { name: textos.confirmar.quitar.accion }).click();
  await expect(items).toHaveCount(4);
  await expect(items.nth(3).getByLabel(t.enlace.texto)).toBeFocused(); // el que quedó en su lugar
  await expect(items.nth(3).getByLabel(t.enlace.texto)).toHaveValue('Producto');

  // Mover y guardar.
  await menu.getByRole('button', { name: textos.campos.lista.bajar('enlace 1') }).click();
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(3));
  expect(((await borrador('site')).nav as { label: string }[]).map((n) => n.label)).toEqual([
    'Proyectos',
    'Servicios',
    'Proceso',
    'Producto',
  ]);
});

test('hero: las etiquetas son exactamente 3, sin agregar ni quitar, y se reordenan', async ({ page }) => {
  await abrir(page, 'hero');
  await expect(page.getByLabel(t.hero.titulo, { exact: true })).toHaveValue(hero.titulo as string);
  const chips = page.getByRole('group', { name: t.hero.chips });
  await expect(chips.getByRole('listitem')).toHaveCount(3);
  await expect(chips.getByRole('button', { name: textos.campos.lista.agregar(t.hero.chip) })).toHaveCount(0);
  await expect(chips.getByRole('button', { name: /^Quitar/ })).toHaveCount(0);

  await chips.getByRole('button', { name: textos.campos.lista.bajar('etiqueta 1') }).click();
  await expect(chips.getByRole('listitem').first().getByLabel(t.hero.chipTexto)).toHaveValue('Android');
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(6));

  const guardado = await borrador('hero');
  expect((guardado.chips as { label: string }[]).map((c) => c.label)).toEqual(['Android', 'Web', 'Sistemas']);
});

test('imagen, select y opcionales: vista previa con cdn(), quitar con confirmación', async ({ page }) => {
  await abrir(page, 'site');
  const imagen = page.getByRole('group', { name: new RegExp(`^${t.site.imagenOg}`) });
  await expect(imagen.getByText(IMAGEN_OG.src)).toBeVisible();
  await expect(imagen.getByText(textos.campos.imagen.pixeles(180, 180))).toBeVisible();
  const vista = imagen.getByRole('img', { name: IMAGEN_OG.alt });
  await expect(vista).toHaveAttribute('src', /\/apple-touch-icon\.png$/);
  await expect.poll(() => vista.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // Quitar la imagen pide confirmación y solo quita la referencia.
  await imagen.getByRole('button', { name: textos.campos.imagen.quitar }).click();
  await dialogo(page).getByRole('button', { name: textos.confirmar.quitarImagen.accion }).click();
  await expect(imagen.getByText(textos.campos.imagen.sinImagen)).toBeVisible();

  // País con el select; la región es opcional: vacía, se quita del documento.
  await page.getByLabel(t.site.pais).selectOption({ label: 'Guatemala' });
  await page.getByLabel(new RegExp(`^${t.site.region}`)).fill('');

  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(3));
  const seo = (await borrador('site')).seo;
  expect(seo).not.toHaveProperty('imagenOg');
  expect(seo.ubicacion).toEqual({ localidad: 'Santa Ana', pais: 'GT' });
});

test('una imagen que no carga muestra el aviso en vez de la vista previa', async ({ page }) => {
  await db().doc('borradores/site').update({ 'seo.imagenOg.src': 'seo/no-existe.webp' });
  await abrir(page, 'site');
  const imagen = page.getByRole('group', { name: new RegExp(`^${t.site.imagenOg}`) });
  await expect(imagen.getByText(textos.campos.imagen.sinVistaPrevia)).toBeVisible();
  await expect(imagen.getByText('seo/no-existe.webp')).toBeVisible();
});

test('avisa antes de perder cambios: al navegar, al recargar y al cerrar sesión', async ({ page }) => {
  await abrir(page, 'site');
  const nombre = page.getByLabel(t.site.nombre);
  await nombre.fill('Sin guardar');

  // Navegar: Cancelar se queda con los cambios.
  await nav(page).getByRole('link', { name: textos.bloques.hero }).click();
  await expect(dialogo(page)).toContainText(textos.confirmar.salir.titulo);
  await dialogo(page).getByRole('button', { name: textos.confirmar.cancelar }).click();
  await expect(page).toHaveURL(/#\/contenido\/site$/);
  await expect(nombre).toHaveValue('Sin guardar');

  // Recargar: el navegador pregunta (beforeunload).
  const aviso = page.waitForEvent('dialog');
  void page.evaluate(() => location.reload()).catch(() => {});
  const nativo = await aviso;
  expect(nativo.type()).toBe('beforeunload');
  await nativo.dismiss();
  await expect(nombre).toHaveValue('Sin guardar');

  // Cerrar sesión también pregunta.
  await page.getByRole('banner').getByRole('button', { name: textos.shell.cerrarSesion }).click();
  await expect(dialogo(page)).toContainText(textos.confirmar.cerrarSesion.texto);
  await dialogo(page).getByRole('button', { name: textos.confirmar.cancelar }).click();
  await expect(nombre).toHaveValue('Sin guardar');

  // Salir sin guardar: no se guardó nada.
  await nav(page).getByRole('link', { name: textos.bloques.hero }).click();
  await dialogo(page).getByRole('button', { name: textos.confirmar.salir.accion }).click();
  await expect(titulo(page)).toHaveText(textos.bloques.hero);
  expect((await borrador('site')).version).toBe(2);
});

test('descartar vuelve a la última versión guardada', async ({ page }) => {
  await abrir(page, 'site');
  const nombre = page.getByLabel(t.site.nombre);
  await nombre.fill('Otro nombre');
  await page.getByRole('button', { name: textos.editor.descartar }).click();
  await dialogo(page).getByRole('button', { name: textos.confirmar.descartar.accion }).click();
  await expect(nombre).toHaveValue('Nexbytes');
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
});

test('si otra pestaña guardó antes, avisa del conflicto y no pisa nada', async ({ page }) => {
  await abrir(page, 'site');
  await page.getByLabel(t.site.nombre).fill('Desde esta pestaña');

  // Otra pestaña guarda mientras tanto (version 3).
  await db().doc('borradores/site').update({ nombre: 'Desde la otra pestaña', version: 3 });

  await guardar(page).click();
  await expect(page.getByRole('alert').filter({ hasText: textos.editor.conflicto })).toBeVisible();
  const guardado = await borrador('site');
  expect(guardado).toMatchObject({ nombre: 'Desde la otra pestaña', version: 3 });

  await page.getByRole('button', { name: textos.editor.cargarGuardada }).click();
  await expect(page.getByLabel(t.site.nombre)).toHaveValue('Desde la otra pestaña');
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
});

test.describe('a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el editor no se desborda y Guardar sigue a la vista', async ({ page }) => {
    await abrir(page, 'site');
    await page.getByLabel(t.site.nombre).fill('Nexbytes 390');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(guardar(page)).toBeInViewport();
    await page.getByRole('group', { name: t.site.nav }).scrollIntoViewIfNeeded();
    await expect(guardar(page)).toBeInViewport();
  });
});
