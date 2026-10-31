/**
 * Página Publicar (T22) contra los emuladores, con el Worker simulado (page.route).
 * GitHub Actions se simula escribiendo en publicaciones/{id} con firebase-admin.
 */
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';
import { db, entrar, json, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const t = textos.publicar;
const PUBLISH = '**/api-simulada/publish';
const NUEVO_TITULO = 'Software que hace crecer tu negocio';

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

// Todo publicado en v1, salvo hero: su borrador v2 cambia el título.
test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const ahora = Timestamp.now();
  await Promise.all(
    NOMBRES_BLOQUES.flatMap((nombre) => [
      db().doc(`borradores/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
      db().doc(`publicado/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
    ]),
  );
  await db().doc('borradores/hero').update({ titulo: NUEVO_TITULO, version: 2 });
});

const leer = async (ruta: string) => (await db().doc(ruta).get()).data()!;
const publicaciones = async () => (await db().collection('publicaciones').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const boton = (page: Page, nombre: string) => page.getByRole('button', { name: nombre, exact: true });
const actual = (page: Page) => page.getByRole('region', { name: t.actual });

async function abrir(page: Page) {
  await entrar(page, undefined, undefined, '/admin#/publicar');
  await expect(titulo(page)).toHaveText(t.titulo);
}

/** Worker simulado: guarda lo que recibe y responde con `estado`. */
function simularWorker(page: Page, estado = 202, cuerpo: Record<string, unknown> = { ok: true }) {
  const pedidos: { cuerpo: unknown; autorizacion?: string }[] = [];
  void page.route(PUBLISH, async (route) => {
    pedidos.push({ cuerpo: route.request().postDataJSON(), autorizacion: route.request().headers()['authorization'] });
    await route.fulfill({ status: estado, json: cuerpo });
  });
  return pedidos;
}

test('Publicar: valida, copia los bloques con cambios y sigue el estado en vivo', async ({ page }) => {
  const pedidos = simularWorker(page);
  await abrir(page);
  const cambios = page.getByRole('region', { name: t.cambios });
  await expect(cambios.getByRole('listitem')).toHaveText([textos.bloques.hero]);

  await boton(page, t.publicar).click();
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo).toContainText(textos.confirmar.publicar.texto(textos.bloques.hero));
  await dialogo.getByRole('button', { name: textos.confirmar.publicar.accion }).click();
  await expect(page.getByText(t.solicitadaOk)).toBeVisible();

  // El batch copió el borrador tal cual (misma version) y registró la solicitud.
  const publicado = await leer('publicado/hero');
  expect(publicado).toMatchObject({ titulo: NUEVO_TITULO, version: 2 });
  expect((await leer('publicado/site')).version).toBe(1); // sin cambios: no se tocó
  const [pub] = await publicaciones();
  expect(pub).toMatchObject({ estado: 'solicitada', tipo: 'produccion' });
  expect(pedidos).toEqual([{ cuerpo: { publicacionId: pub.id, tipo: 'produccion' }, autorizacion: expect.stringMatching(/^Bearer .+/) }]);

  // En curso: no se puede pedir otra.
  await expect(actual(page)).toContainText(textos.publicaciones.estados.solicitada);
  await expect(boton(page, t.vistaPrevia)).toBeDisabled();
  await expect(page.getByText(t.enCurso)).toBeVisible();

  // GitHub Actions avanza: el estado se ve al momento.
  await db().doc(`publicaciones/${pub.id}`).update({ estado: 'construyendo' });
  await expect(actual(page)).toContainText(textos.publicaciones.estados.construyendo);
  await db().doc(`publicaciones/${pub.id}`).update({ estado: 'publicada', url: 'https://nexbytes1.web.app', terminadaEn: Timestamp.now() });
  await expect(actual(page)).toContainText(textos.publicaciones.estados.publicada);
  await expect(actual(page).getByRole('link', { name: t.abrirSitio })).toHaveAttribute('href', 'https://nexbytes1.web.app');

  await expect(boton(page, t.vistaPrevia)).toBeEnabled();
  await expect(cambios.getByText(t.sinCambios)).toBeVisible();
  await expect(boton(page, t.publicar)).toBeDisabled(); // nada más que publicar
  await expect(page.getByRole('link', { name: textos.shell.todoPublicado })).toBeVisible();
});

test('Vista previa: no copia nada a lo publicado', async ({ page }) => {
  const pedidos = simularWorker(page);
  await abrir(page);
  await boton(page, t.vistaPrevia).click();
  await expect(page.getByText(t.solicitadaOk)).toBeVisible();

  expect((await leer('publicado/hero')).version).toBe(1);
  const [pub] = await publicaciones();
  expect(pub).toMatchObject({ estado: 'solicitada', tipo: 'preview' });
  expect(pedidos.map((p) => p.cuerpo)).toEqual([{ publicacionId: pub.id, tipo: 'preview' }]);

  await db().doc(`publicaciones/${pub.id}`).update({ estado: 'publicada', url: 'https://nexbytes1--preview-x.web.app', terminadaEn: Timestamp.now() });
  await expect(actual(page).getByRole('link', { name: t.abrirPreview })).toHaveAttribute('href', 'https://nexbytes1--preview-x.web.app');
});

test('sin publicación automática (503): marca el error, explica cómo publicar a mano y no bloquea', async ({ page }) => {
  simularWorker(page, 503, { error: 'Publicación automática no configurada' });
  await abrir(page);

  await boton(page, t.publicar).click();
  await page.getByRole('alertdialog').getByRole('button', { name: textos.confirmar.publicar.accion }).click();
  await expect(page.getByRole('alert')).toHaveText(`Publicación automática no configurada. ${t.manualProduccion}`);

  // Los cambios ya quedaron en lo publicado (npm run deploy:cms los toma de ahí).
  expect((await leer('publicado/hero')).version).toBe(2);
  const [pub] = await publicaciones();
  expect(pub).toMatchObject({ estado: 'error', error: 'Publicación automática no configurada' });
  await expect(actual(page)).toContainText(textos.publicaciones.estados.error);
  await expect(boton(page, t.vistaPrevia)).toBeEnabled();

  await boton(page, t.vistaPrevia).click();
  await expect(page.getByRole('alert')).toHaveText(`Publicación automática no configurada. ${t.manualPreview}`);
});

test('borradores que no pasan el schema: no copia nada ni pide nada', async ({ page }) => {
  const pedidos = simularWorker(page);
  await db().doc('borradores/hero').update({ titulo: '' });
  await abrir(page);

  await boton(page, t.publicar).click();
  await page.getByRole('alertdialog').getByRole('button', { name: textos.confirmar.publicar.accion }).click();
  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText(t.invalidos);
  await expect(alerta).toContainText(`${textos.bloques.hero}: titulo — ${textos.errores.obligatorio}`);
  await expect(alerta.getByRole('link', { name: textos.bloques.hero })).toHaveAttribute('href', '#/contenido/hero');

  expect((await leer('publicado/hero')).version).toBe(1);
  expect(await publicaciones()).toEqual([]);
  expect(pedidos).toEqual([]);
});

test('historial: las últimas 10, y una solicitud vieja sin respuesta no bloquea', async ({ page }) => {
  const ahora = Date.now();
  const lote = db().batch();
  for (let i = 0; i < 12; i++) {
    lote.set(db().doc(`publicaciones/p${String(i).padStart(2, '0')}`), {
      estado: i === 11 ? 'solicitada' : 'publicada',
      tipo: i % 2 ? 'preview' : 'produccion',
      // p0 hace 12 h … p10 hace 2 h; la más nueva (p11) se pidió hace 40 minutos y nunca respondió.
      solicitadaEn: Timestamp.fromMillis(i === 11 ? ahora - 40 * 60_000 : ahora - (12 - i) * 60 * 60_000),
      ...(i === 11 ? {} : { url: `https://sitio-${i}.web.app`, terminadaEn: Timestamp.fromMillis(ahora - (12 - i) * 60 * 60_000) }),
    });
  }
  await lote.commit();
  await abrir(page);

  const filas = page.getByRole('region', { name: t.historial }).locator('tbody tr');
  await expect(filas).toHaveCount(10);
  await expect(filas.first()).toContainText(textos.publicaciones.estados.sinRespuesta);
  await expect(filas.nth(1)).toContainText('sitio-10.web.app');
  await expect(filas.last()).toContainText('sitio-2.web.app');
  await expect(boton(page, t.vistaPrevia)).toBeEnabled();
  await expect(page.getByText(t.enCurso)).toHaveCount(0);
});

test('una publicación en curso deshabilita los dos botones', async ({ page }) => {
  await db().doc('publicaciones/en-curso').set({ estado: 'construyendo', tipo: 'produccion', solicitadaEn: Timestamp.now() });
  await abrir(page);
  await expect(page.getByText(t.enCurso)).toBeVisible();
  await expect(boton(page, t.vistaPrevia)).toBeDisabled();
  await expect(boton(page, t.publicar)).toBeDisabled();
});
