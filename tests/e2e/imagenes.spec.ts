/**
 * Subida de imágenes desde el admin (T21), con el Worker simulado (page.route):
 * procesamiento en el navegador, vista previa, subida, errores, alt obligatorio
 * y borrado del almacenamiento.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';
import { db, entrar, json, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const t = textos.campos.imagen;
const API = '**/api-simulada/upload';
const archivo = (nombre: string, mimeType: string) => ({
  name: nombre,
  mimeType,
  buffer: readFileSync(`tests/e2e/archivos/${nombre}`),
});
const FOTO_GRANDE = archivo('foto-grande.jpg', 'image/jpeg'); // 3000×2000
const FOTO_PEQUENA = archivo('foto-pequena.png', 'image/png'); // 800×600
const FOTO_GIRADA = archivo('foto-girada.jpg', 'image/jpeg'); // 400×200 con EXIF Orientation 6

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const ahora = Timestamp.now();
  await Promise.all(
    NOMBRES_BLOQUES.flatMap((nombre) => [
      db().doc(`borradores/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
      db().doc(`publicado/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
    ]),
  );
});

const borrador = async (bloque: string) => (await db().doc(`borradores/${bloque}`).get()).data()!;
const estado = (page: Page) => page.getByRole('status').filter({ hasText: /Sin cambios|Cambios sin guardar|Guardando|Guardado/ });
const guardar = (page: Page) => page.getByRole('button', { name: textos.editor.guardar, exact: true });
const dialogo = (page: Page) => page.getByRole('alertdialog');

async function abrir(page: Page, bloque: 'site' | 'nosotros' | 'proyectos') {
  await entrar(page, undefined, undefined, `/admin#/contenido/${bloque}`);
  await expect(titulo(page)).toHaveText(textos.bloques[bloque]);
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios);
}

const campoFoto = (page: Page) => page.getByRole('group', { name: new RegExp(`^${textos.bloquesEditor.nosotros.foto}`) });

/** Lo que llegó al Worker simulado en una subida. */
function leerSubida(peticion: Request) {
  const cuerpo = peticion.postDataBuffer()!;
  const texto = cuerpo.toString('latin1');
  const campo = (nombre: string) => texto.match(new RegExp(`name="${nombre}"\\r\\n\\r\\n([^\\r]*)`))?.[1];
  const inicio = texto.indexOf('RIFF');
  return {
    autorizacion: peticion.headers()['authorization'],
    prefijo: campo('prefijo'),
    slug: campo('slug'),
    esWebp: inicio >= 0 && texto.slice(inicio + 8, inicio + 12) === 'WEBP',
  };
}

test('subida exitosa: procesa en el navegador, muestra progreso y guarda la ruta', async ({ page }) => {
  const subidas: ReturnType<typeof leerSubida>[] = [];
  await page.route(API, async (route: Route) => {
    subidas.push(leerSubida(route.request()));
    await new Promise((r) => setTimeout(r, 600)); // para ver el progreso
    await route.fulfill({ status: 201, json: { path: 'nosotros/foto-0123456789.webp' } });
  });

  await abrir(page, 'nosotros');
  const foto = campoFoto(page);
  await expect(foto.getByText(t.soltar)).toBeVisible();
  await foto.locator('input[type=file]').setInputFiles(FOTO_GRANDE);

  // Vista previa antes de subir: lado mayor 1600, peso final.
  await expect(foto.getByText(t.vistaPrevia, { exact: true })).toBeVisible();
  await expect(foto.getByText(t.pixeles(1600, 1067))).toBeVisible();
  await expect(foto.getByText(/^\d+ KB$/)).toBeVisible();
  expect(subidas).toHaveLength(0); // nada se sube sin confirmar

  await foto.getByRole('button', { name: t.subir }).click();
  await expect(foto.getByRole('progressbar')).toBeVisible();
  await expect(foto.getByText(t.subida)).toBeVisible();

  expect(subidas).toEqual([{ autorizacion: expect.stringMatching(/^Bearer .+/), prefijo: 'nosotros', slug: 'foto', esWebp: true }]);
  await expect(foto.getByText('nosotros/foto-0123456789.webp')).toBeVisible();
  const alt = foto.getByLabel(t.alt);
  await expect(alt).toBeFocused();

  await alt.fill('Fernando Martínez en su estudio');
  await guardar(page).click();
  await expect(estado(page)).toHaveText(textos.editor.estado.guardado(2));
  expect((await borrador('nosotros')).foto).toEqual({
    src: 'nosotros/foto-0123456789.webp',
    alt: 'Fernando Martínez en su estudio',
    width: 1600,
    height: 1067,
  });
});

test('imagen para compartir: muestra el recorte exacto de 1200×630 antes de subir', async ({ page }) => {
  let subida: ReturnType<typeof leerSubida> | undefined;
  await page.route(API, async (route) => {
    subida = leerSubida(route.request());
    await route.fulfill({ status: 201, json: { path: 'seo/og-0123456789.webp' } });
  });

  await abrir(page, 'site');
  const og = page.getByRole('group', { name: new RegExp(`^${textos.editores.site.imagenOg}`) });
  await og.locator('input[type=file]').setInputFiles(FOTO_GRANDE);
  await expect(og.getByText(t.vistaPreviaOg)).toBeVisible();
  const vista = og.getByRole('img', { name: t.vistaPrevia });
  await expect.poll(() => vista.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1200, 630]);

  await og.getByRole('button', { name: t.subir }).click();
  await expect(og.getByText('seo/og-0123456789.webp')).toBeVisible();
  expect(subida).toMatchObject({ prefijo: 'seo', slug: 'og', esWebp: true });
});

test('respeta la orientación del celular y no agranda imágenes pequeñas', async ({ page }) => {
  await abrir(page, 'nosotros');
  const foto = campoFoto(page);

  await foto.locator('input[type=file]').setInputFiles(FOTO_GIRADA);
  await expect(foto.getByText(t.pixeles(200, 400))).toBeVisible(); // 400×200 con EXIF 6 → vertical
  await foto.getByRole('button', { name: t.cancelar }).click();

  await foto.locator('input[type=file]').setInputFiles(FOTO_PEQUENA);
  await expect(foto.getByText(t.pixeles(800, 600))).toBeVisible();
});

test('error del servidor: muestra el mensaje y la vista previa queda para reintentar', async ({ page }) => {
  let intentos = 0;
  await page.route(API, async (route) => {
    intentos++;
    if (intentos === 1) await route.fulfill({ status: 503, json: { error: 'No se pudo guardar en R2. Intenta de nuevo.' } });
    else await route.fulfill({ status: 201, json: { path: 'nosotros/foto-aaaaaaaaaa.webp' } });
  });

  await abrir(page, 'nosotros');
  const foto = campoFoto(page);
  await foto.locator('input[type=file]').setInputFiles(FOTO_PEQUENA);
  await foto.getByRole('button', { name: t.subir }).click();
  await expect(foto.getByRole('alert')).toHaveText('No se pudo guardar en R2. Intenta de nuevo.');
  await expect(foto.getByText(t.vistaPrevia, { exact: true })).toBeVisible();
  await expect(estado(page)).toHaveText(textos.editor.estado.sinCambios); // nada cambió en el formulario

  await foto.getByRole('button', { name: t.subir }).click();
  await expect(foto.getByText('nosotros/foto-aaaaaaaaaa.webp')).toBeVisible();
  expect(intentos).toBe(2);
});

test('archivo ilegible (HEIC en Chrome): avisa y no sube nada', async ({ page }) => {
  let llamadas = 0;
  await page.route(API, (route) => {
    llamadas++;
    return route.abort();
  });
  await abrir(page, 'nosotros');
  const foto = campoFoto(page);
  // Encabezado HEIC real seguido de basura: Chrome no lo decodifica.
  const heic = Buffer.concat([Buffer.from('000000186674797068656963000000006d696631', 'hex'), Buffer.alloc(2000, 7)]);
  await foto.locator('input[type=file]').setInputFiles({ name: 'IMG_0001.HEIC', mimeType: 'image/heic', buffer: heic });
  await expect(foto.getByRole('alert')).toHaveText(t.errores.ilegible);
  await expect(foto.getByRole('button', { name: t.subir })).toHaveCount(0);
  expect(llamadas).toBe(0);
});

test('alt vacío impide guardar', async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ status: 201, json: { path: 'nosotros/foto-bbbbbbbbbb.webp' } }));
  await abrir(page, 'nosotros');
  const foto = campoFoto(page);
  await foto.locator('input[type=file]').setInputFiles(FOTO_PEQUENA);
  await foto.getByRole('button', { name: t.subir }).click();
  await expect(foto.getByText(t.subida)).toBeVisible();

  await guardar(page).click();
  const alt = foto.getByLabel(t.alt);
  await expect(alt).toHaveAttribute('aria-invalid', 'true');
  await expect(foto.getByText(textos.errores.obligatorio)).toBeVisible();
  await expect(alt).toBeFocused();
  expect((await borrador('nosotros')).version).toBe(1);
  expect((await borrador('nosotros')).foto).toBeUndefined();
});

test.describe('borrar del almacenamiento', () => {
  const RUTA = 'nosotros/foto-cccccccccc.webp';
  const FOTO = { src: RUTA, alt: 'Fernando', width: 800, height: 600 };

  async function preparar(page: Page, opciones: { tambienEnProyectos?: boolean; publicada?: boolean } = {}) {
    await db().doc('borradores/nosotros').update({ foto: FOTO });
    if (opciones.publicada) await db().doc('publicado/nosotros').update({ foto: FOTO });
    if (opciones.tambienEnProyectos) {
      const proyectos = json<{ items: Record<string, unknown>[] }>('proyectos');
      proyectos.items[0].imagen = FOTO;
      await db().doc('borradores/proyectos').update({ items: proyectos.items });
    }
    const borrados: unknown[] = [];
    await page.route(API, async (route) => {
      if (route.request().method() === 'DELETE') {
        borrados.push(route.request().postDataJSON());
        await route.fulfill({ status: 204 });
      } else await route.abort();
    });
    await abrir(page, 'nosotros');
    return borrados;
  }

  const borrar = async (page: Page) => {
    await campoFoto(page).getByRole('button', { name: t.borrar }).click();
    await dialogo(page).getByRole('button', { name: textos.confirmar.borrarImagen.accion }).click();
  };

  test('si nada más la usa, la borra de R2 y del campo', async ({ page }) => {
    const borrados = await preparar(page);
    await borrar(page);
    await expect(campoFoto(page).getByText(t.borrada)).toBeVisible();
    expect(borrados).toEqual([{ path: RUTA }]);
    await expect(campoFoto(page).getByText(t.soltar)).toBeVisible();
    await expect(estado(page)).toHaveText(textos.editor.estado.sucio); // falta guardar el campo vacío
  });

  test('si otro bloque del borrador la usa, no la borra', async ({ page }) => {
    const borrados = await preparar(page, { tambienEnProyectos: true });
    await borrar(page);
    await expect(campoFoto(page).getByRole('alert')).toHaveText(t.enUso);
    expect(borrados).toEqual([]);
    await expect(campoFoto(page).getByText(RUTA)).toBeVisible();
  });

  test('si está en el sitio publicado, no la borra', async ({ page }) => {
    const borrados = await preparar(page, { publicada: true });
    await borrar(page);
    await expect(campoFoto(page).getByRole('alert')).toHaveText(t.enUsoPublicado);
    expect(borrados).toEqual([]);
  });

  test('"Quitar" solo borra la referencia, nunca el archivo', async ({ page }) => {
    const borrados = await preparar(page);
    await campoFoto(page).getByRole('button', { name: t.quitar }).click();
    await dialogo(page).getByRole('button', { name: textos.confirmar.quitarImagen.accion }).click();
    await expect(campoFoto(page).getByText(t.soltar)).toBeVisible();
    expect(borrados).toEqual([]);
  });
});
