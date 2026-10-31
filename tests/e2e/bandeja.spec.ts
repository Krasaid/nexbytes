/**
 * Bandeja (T23) contra los emuladores: lista paginada con cursores, filtros y
 * búsqueda en la URL, detalle con estado, notas y contacto, contador de nuevas
 * en vivo y lista de espera con CSV.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { db, entrar, nav, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const t = textos.bandeja;
const NOMBRES = ['María López', 'José Peña', 'Ana Rivas', 'Carlos Méndez', 'Lucía Torres'];
const ESTADOS = ['nuevo', 'contactado', 'propuesta', 'ganado', 'perdido'];

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

// 25 cotizaciones: c00 la más nueva (hace 1 h) … c24 la más vieja. Nombre y estado rotan
// juntos (José siempre "contactado"); 5 nuevas. c00 deja todo; c01 solo correo.
test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const ahora = Date.now();
  const lote = db().batch();
  for (let i = 0; i < 25; i++) {
    const id = `c${String(i).padStart(2, '0')}`;
    lote.set(db().doc(`cotizaciones/${id}`), {
      ref: `NX-AB${String(i).padStart(2, '0')}`,
      tipo: i % 2 ? 'App Android' : 'Tienda en línea',
      funciones: i === 0 ? ['Pagos en línea', 'Facturación'] : [],
      plazo: 'En 1 a 2 meses',
      presupuesto: '$800 – $2,000',
      nombre: NOMBRES[i % 5],
      empresa: i === 0 ? 'Café Las Brumas' : '',
      correo: i === 0 ? 'maria@cafe.com' : i === 1 ? 'jose@pena.sv' : '',
      whatsapp: i === 1 ? '' : '7000 1234',
      descripcion: i === 0 ? 'Vender café en línea.\nCon entrega a domicilio.' : '',
      estado: ESTADOS[i % 5],
      canal: 'whatsapp',
      creadoEn: Timestamp.fromMillis(ahora - (i + 1) * 3600_000),
    });
  }
  for (const [id, email, estado, horas] of [
    ['l1', 'ana@negocio.com', 'nuevo', 1],
    ['l2', 'lucía@ejemplo.com', 'invitado', 2],
    ['l3', 'carlos@x.com', 'invitado', 3],
  ] as const) {
    lote.set(db().doc(`lista_espera/${id}`), { email, estado, creadoEn: Timestamp.fromMillis(ahora - horas * 3600_000) });
  }
  await lote.commit();
});

const filas = (page: Page) => page.locator('tbody tr');
const contador = (page: Page) => nav(page).getByRole('link', { name: new RegExp(`^${textos.shell.cotizaciones}`) });

async function abrir(page: Page, ruta = '/admin#/bandeja/cotizaciones') {
  await entrar(page, undefined, undefined, ruta);
  await expect(titulo(page)).toBeVisible();
}

test('lista: 20 por página con cursores, la más nueva primero, y contador de nuevas', async ({ page }) => {
  await abrir(page);
  await expect(titulo(page)).toHaveText(textos.shell.cotizaciones);
  await expect(filas(page)).toHaveCount(20);

  const primera = filas(page).first();
  await expect(primera).toContainText('NX-AB00');
  await expect(primera).toContainText('María López');
  await expect(primera).toContainText('Café Las Brumas');
  await expect(primera).toContainText('Tienda en línea');
  await expect(primera).toContainText('$800 – $2,000');
  await expect(primera.locator('time')).toHaveText('hace 1 hora');
  await expect(primera).toContainText(t.estadosCotizacion.nuevo);

  await page.getByRole('button', { name: t.siguiente }).click();
  await expect(filas(page)).toHaveCount(5);
  await expect(filas(page).first()).toContainText('NX-AB20');
  await expect(page.getByText(t.pagina(2))).toBeVisible();
  await expect(page.getByRole('button', { name: t.siguiente })).toBeDisabled();
  await page.getByRole('button', { name: t.anterior }).click();
  await expect(filas(page)).toHaveCount(20);
  await expect(filas(page).first()).toContainText('NX-AB00');

  await expect(contador(page)).toContainText('5');
  // El número visible es aria-hidden: el lector de pantalla oye "Cotizaciones (5 nuevas)".
  await expect(contador(page)).toHaveAccessibleName(`${textos.shell.cotizaciones} (${t.nuevas(5)})`);
});

test('filtros y búsqueda en la URL', async ({ page }) => {
  await abrir(page);
  await page.getByLabel(t.filtroEstado, { exact: true }).selectOption('contactado');
  await expect(page).toHaveURL(/#\/bandeja\/cotizaciones\?estado=contactado$/);
  await expect(filas(page)).toHaveCount(5);
  for (const fila of await filas(page).all()) await expect(fila).toContainText(t.estadosCotizacion.contactado);

  // Recargar conserva el filtro.
  await page.reload();
  await expect(page.getByLabel(t.filtroEstado, { exact: true })).toHaveValue('contactado');
  await expect(filas(page)).toHaveCount(5);

  // Nombre por cómo empieza (mayúscula inicial automática).
  await page.getByLabel(t.buscar).fill('jos');
  await expect(page).toHaveURL(/estado=contactado&q=jos$/);
  await expect(filas(page)).toHaveCount(5);
  for (const fila of await filas(page).all()) await expect(fila).toContainText('José Peña');

  // Ref exacto con otro estado: sin resultados.
  await page.getByLabel(t.buscar).fill('ab07');
  await expect(page.getByText(t.sinResultados)).toBeVisible();

  await page.getByRole('button', { name: t.limpiar }).click();
  await expect(page).toHaveURL(/#\/bandeja\/cotizaciones$/);
  await expect(filas(page)).toHaveCount(20);

  await page.getByLabel(t.buscar).fill('nx-ab07');
  await expect(filas(page)).toHaveCount(1);
  await expect(filas(page).first()).toContainText('NX-AB07');
});

test('detalle: todos los campos, contacto, estado y notas', async ({ page }) => {
  await abrir(page, '/admin#/bandeja/cotizaciones?estado=nuevo');
  await page.getByRole('link', { name: 'NX-AB00' }).click();
  await expect(page).toHaveURL(/#\/bandeja\/cotizaciones\/c00$/);
  await expect(titulo(page)).toHaveText(t.cotizacion('NX-AB00'));

  for (const texto of ['María López', 'Café Las Brumas', 'maria@cafe.com', '7000 1234', 'Pagos en línea', 'Facturación', 'En 1 a 2 meses', 'Con entrega a domicilio.']) {
    await expect(page.getByRole('main')).toContainText(texto);
  }

  // WhatsApp al número del cliente (con 503) y saludo con el ref; mailto con asunto.
  const wa = new URL((await page.getByRole('link', { name: t.escribirWhatsapp }).getAttribute('href'))!);
  expect(wa.origin + wa.pathname).toBe('https://wa.me/50370001234');
  expect(wa.searchParams.get('text')).toBe(t.saludo('María', 'NX-AB00'));
  const correo = (await page.getByRole('link', { name: t.escribirCorreo }).getAttribute('href'))!;
  expect(correo).toMatch(/^mailto:maria@cafe\.com\?subject=/);
  expect(decodeURIComponent(correo)).toContain('NX-AB00');

  // Estado: se guarda al elegirlo y el contador baja en vivo.
  await page.getByRole('radio', { name: t.estadosCotizacion.contactado }).check();
  await expect(page.getByText(t.estadoGuardado)).toBeVisible();
  expect((await db().doc('cotizaciones/c00').get()).get('estado')).toBe('contactado');
  await expect(contador(page)).toContainText('4');

  // Notas: su propio botón.
  const notas = page.getByRole('textbox', { name: t.notas });
  const guardar = page.getByRole('button', { name: t.guardarNotas });
  await expect(guardar).toBeDisabled();
  await notas.fill('Llamar el lunes por la mañana.');
  await expect(page.getByText(t.notasSinGuardar)).toBeVisible();

  // Con notas sin guardar, salir pide confirmación.
  await nav(page).getByRole('link', { name: textos.shell.inicio }).click();
  await expect(page.getByRole('alertdialog')).toContainText(textos.confirmar.salir.titulo);
  await page.getByRole('alertdialog').getByRole('button', { name: textos.confirmar.cancelar }).click();

  await guardar.click();
  await expect(page.getByText(t.notasGuardadas)).toBeVisible();
  expect((await db().doc('cotizaciones/c00').get()).get('notas')).toBe('Llamar el lunes por la mañana.');

  // Volver regresa a la lista con el filtro con el que se llegó.
  await page.getByRole('link', { name: t.volver }).click();
  await expect(page).toHaveURL(/#\/bandeja\/cotizaciones\?estado=nuevo$/);
});

test('sin WhatsApp válido no hay botón; con correo sí hay mailto', async ({ page }) => {
  await abrir(page, '/admin#/bandeja/cotizaciones/c01');
  await expect(titulo(page)).toHaveText(t.cotizacion('NX-AB01'));
  await expect(page.getByRole('link', { name: t.escribirWhatsapp })).toHaveCount(0);
  await expect(page.getByRole('link', { name: t.escribirCorreo })).toHaveAttribute('href', /^mailto:jose@pena\.sv/);
});

test('el contador de nuevas se actualiza solo cuando llega una cotización', async ({ page }) => {
  await abrir(page);
  await expect(contador(page)).toContainText('5');
  await db().doc('cotizaciones/nueva').set({ ref: 'NX-ZZ99', nombre: 'Nueva', estado: 'nuevo', creadoEn: Timestamp.now() });
  await expect(contador(page)).toContainText('6');
});

test('lista de espera: cambio de estado, filtro en la URL y CSV con BOM UTF-8', async ({ page }) => {
  await abrir(page, '/admin#/bandeja/lista-espera');
  await expect(titulo(page)).toHaveText(textos.shell.listaEspera);
  await expect(filas(page)).toHaveCount(3);

  await page.getByLabel(t.cambiarEstado('ana@negocio.com')).selectOption('invitado');
  await expect(page.getByText(t.estadoGuardado)).toBeVisible();
  expect((await db().doc('lista_espera/l1').get()).get('estado')).toBe('invitado');

  await page.getByLabel(t.filtroEstado, { exact: true }).selectOption('baja');
  await expect(page).toHaveURL(/#\/bandeja\/lista-espera\?estado=baja$/);
  await expect(page.getByText(t.sinResultados)).toBeVisible();
  await page.getByLabel(t.filtroEstado, { exact: true }).selectOption('invitado');
  await expect(filas(page)).toHaveCount(3);

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: t.exportar }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^lista-de-espera-\d{4}-\d{2}-\d{2}\.csv$/);
  const contenido = readFileSync((await archivo.path())!, 'utf8');
  expect(contenido.charCodeAt(0)).toBe(0xfeff);
  const lineas = contenido.slice(1).trimEnd().split('\r\n');
  expect(lineas[0]).toBe(t.csvEncabezado.join(','));
  expect(lineas.slice(1).map((l) => l.split(',').slice(0, 2).join(','))).toEqual([
    `ana@negocio.com,${t.estadosLista.invitado}`,
    `lucía@ejemplo.com,${t.estadosLista.invitado}`,
    `carlos@x.com,${t.estadosLista.invitado}`,
  ]);
});

test.describe('a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la bandeja no desborda la página', async ({ page }) => {
    await abrir(page);
    for (const ruta of ['/admin#/bandeja/cotizaciones', '/admin#/bandeja/cotizaciones/c00', '/admin#/bandeja/lista-espera']) {
      await page.goto(ruta);
      await expect(titulo(page)).toBeVisible();
      await expect(page.locator('main')).not.toContainText(textos.cargando);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), ruta).toBeLessThanOrEqual(390);
    }
  });
});
