/**
 * Flujos de trabajo del admin solo con teclado (T24), con el foco visible en
 * cada paso. La navegación del panel ya se recorre en admin.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';
import { db, entrar, json, reiniciarEmuladores, titulo, vaciarFirestore } from './apoyo';

const DORADO = 'rgb(212, 175, 55)';

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
});

test.beforeEach(async ({ request }) => {
  await vaciarFirestore(request);
  const ahora = Timestamp.now();
  await Promise.all([
    ...NOMBRES_BLOQUES.flatMap((nombre) => [
      db().doc(`borradores/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
      db().doc(`publicado/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
    ]),
    db().doc('cotizaciones/c1').set({
      ref: 'NX-KB12', tipo: 'Tienda en línea', funciones: [], plazo: 'Lo antes posible', presupuesto: '$800 – $2,000',
      nombre: 'Ana Rivas', empresa: '', correo: 'ana@x.com', whatsapp: '', descripcion: '', estado: 'nuevo', canal: 'whatsapp',
      creadoEn: ahora,
    }),
  ]);
});

/** Avanza con Tab hasta que `llegar()` sea cierto; cada elemento enfocado debe tener el contorno dorado. */
async function tabularHasta(page: Page, llegar: () => Promise<boolean>, maximo = 40) {
  for (let i = 0; i < maximo; i++) {
    if (await llegar()) return;
    await page.keyboard.press('Tab');
    const contorno = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const e = getComputedStyle(el);
      return { texto: (el.getAttribute('aria-label') ?? el.textContent ?? el.id).trim().slice(0, 40), estilo: `${e.outlineStyle} ${e.outlineColor}` };
    });
    expect(contorno.estilo, `foco visible en "${contorno.texto}"`).toBe(`solid ${DORADO}`);
  }
  throw new Error('No se llegó al elemento con Tab');
}

test('editar un campo y guardar solo con teclado (Enter envía el formulario)', async ({ page }) => {
  await entrar(page, undefined, undefined, '/admin#/contenido/site');
  await expect(titulo(page)).toBeFocused();
  const nombre = page.getByLabel(textos.editores.site.nombre);
  await tabularHasta(page, () => nombre.evaluate((el) => el === document.activeElement));
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Nexbytes Studio');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: textos.editor.estado.guardado(2) })).toBeVisible();
  expect((await db().doc('borradores/site').get()).get('nombre')).toBe('Nexbytes Studio');
});

test('cambiar el estado de una cotización con las flechas', async ({ page }) => {
  await entrar(page, undefined, undefined, '/admin#/bandeja/cotizaciones/c1');
  await expect(titulo(page)).toHaveText(textos.bandeja.cotizacion('NX-KB12'));
  const nueva = page.getByRole('radio', { name: textos.bandeja.estadosCotizacion.nuevo });
  await tabularHasta(page, () => nueva.evaluate((el) => el === document.activeElement));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: textos.bandeja.estadosCotizacion.contactado })).toBeChecked();
  await expect(page.getByText(textos.bandeja.estadoGuardado)).toBeVisible();
  expect((await db().doc('cotizaciones/c1').get()).get('estado')).toBe('contactado');
});

test('pedir una vista previa solo con teclado', async ({ page }) => {
  let pedidos = 0;
  await page.route('**/api-simulada/publish', (r) => {
    pedidos++;
    return r.fulfill({ status: 202, json: { ok: true } });
  });
  await entrar(page, undefined, undefined, '/admin#/publicar');
  await expect(titulo(page)).toBeFocused();
  const vistaPrevia = page.getByRole('button', { name: textos.publicar.vistaPrevia, exact: true });
  await tabularHasta(page, () => vistaPrevia.evaluate((el) => el === document.activeElement));
  await page.keyboard.press('Space');
  await expect(page.getByText(textos.publicar.solicitadaOk)).toBeVisible();
  expect(pedidos).toBe(1);
});
