/**
 * De punta a punta contra los emuladores (T24): editar un texto en el admin →
 * vista previa (build desde los borradores) → Publicar en el panel → el build
 * de producción (desde lo publicado) lo muestra. Es el mismo camino que
 * `npm run deploy:cms:preview` y `npm run deploy:cms`, sin desplegar nada.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';
import { db, entrar, json, reiniciarEmuladores, titulo, vaciarFirestore, FIRESTORE } from './apoyo';

const TITULO = 'Software a la medida, de punta a punta';
const carpetas: string[] = [];

/** astro build desde Firestore (emulador) a una carpeta temporal; devuelve el HTML de la portada. */
function construir(fuente: 'firestore' | 'firestore-borradores'): string {
  const salida = mkdtempSync(join(tmpdir(), 'nexbytes-e2e-'));
  carpetas.push(salida);
  execSync(`npx astro build --outDir "${salida}"`, {
    env: { ...process.env, CONTENT_SOURCE: fuente, FIRESTORE_EMULATOR_HOST: FIRESTORE },
    stdio: 'pipe',
  });
  return readFileSync(join(salida, 'index.html'), 'utf8');
}

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);
  await vaciarFirestore(request);
  const ahora = Timestamp.now();
  await Promise.all(
    NOMBRES_BLOQUES.flatMap((nombre) => [
      db().doc(`borradores/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
      db().doc(`publicado/${nombre}`).set({ ...json(nombre), version: 1, actualizadoEn: ahora }),
    ]),
  );
});

test.afterAll(() => {
  for (const c of carpetas) rmSync(c, { recursive: true, force: true });
});

test('editar → vista previa → publicar → el cambio aparece en el sitio', async ({ page }) => {
  test.setTimeout(180_000);
  const original = json<{ titulo: string }>('hero').titulo;

  // 1. Editar y guardar en el admin.
  await entrar(page, undefined, undefined, '/admin#/contenido/hero');
  await expect(titulo(page)).toHaveText(textos.bloques.hero);
  await page.getByLabel(textos.editores.hero.titulo, { exact: true }).fill(TITULO);
  await page.getByRole('button', { name: textos.editor.guardar, exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: textos.editor.estado.guardado(2) })).toBeVisible();

  // 2. Vista previa: el build desde los borradores ya lo muestra; el de producción todavía no.
  expect(construir('firestore-borradores')).toContain(TITULO);
  const antes = construir('firestore');
  expect(antes).not.toContain(TITULO);
  expect(antes).toContain(original);

  // 3. Publicar en el panel (sin GitHub Actions: el Worker responde 503 y se publica a mano).
  await page.route('**/api-simulada/publish', (r) => r.fulfill({ status: 503, json: { error: 'Publicación automática no configurada' } }));
  await page.goto('/admin#/publicar');
  await page.getByRole('button', { name: textos.publicar.publicar, exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: textos.confirmar.publicar.accion }).click();
  await expect(page.getByRole('alert')).toContainText(textos.publicar.manualProduccion);

  // 4. El build de producción (npm run deploy:cms) ya tiene el texto nuevo.
  const despues = construir('firestore');
  expect(despues).toContain(TITULO);
  expect(despues).not.toContain(original);
});
