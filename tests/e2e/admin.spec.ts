/**
 * Panel /admin en el navegador, contra los emuladores (npm run test:e2e).
 * Siembra dos cuentas: la de administración (mismo UID que firestore.rules) y otra cualquiera.
 */
import { expect, test } from '@playwright/test';

import { textos } from '../../src/admin/textos';
import { ADMIN, CONTRASENA, OTRA, db, entrar, nav, reiniciarEmuladores, titulo } from './apoyo';

const DORADO = 'rgb(212, 175, 55)';

test.beforeAll(async ({ request }) => {
  await reiniciarEmuladores(request);

  // hero tiene cambios; servicios nunca se publicó; site está al día.
  const d = db();
  const ahora = new Date();
  await Promise.all([
    d.doc('borradores/site').set({ version: 2, actualizadoEn: ahora }),
    d.doc('borradores/hero').set({ version: 3, actualizadoEn: ahora }),
    d.doc('borradores/servicios').set({ version: 1, actualizadoEn: ahora }),
    d.doc('publicado/site').set({ version: 2, actualizadoEn: ahora }),
    d.doc('publicado/hero').set({ version: 2, actualizadoEn: ahora }),
    d.doc('cotizaciones/c1').set({ estado: 'nuevo' }),
    d.doc('cotizaciones/c2').set({ estado: 'nuevo' }),
    d.doc('cotizaciones/c3').set({ estado: 'contactado' }),
    d.doc('publicaciones/p1').set({ estado: 'publicada', tipo: 'preview', solicitadaEn: new Date('2026-10-30T15:00:00Z') }),
  ]);
});

test('la cuenta admin entra y ve el resumen', async ({ page }) => {
  await entrar(page);

  await expect(titulo(page)).toHaveText(textos.inicio.titulo);
  await expect(titulo(page)).toBeFocused();
  await expect(page.getByRole('banner').getByText(ADMIN)).toBeVisible();

  await expect(page.getByRole('region', { name: textos.inicio.cotizacionesNuevas })).toContainText('2');
  await expect(page.getByRole('region', { name: textos.inicio.ultimaPublicacion })).toContainText(
    `${textos.publicaciones.estados.publicada} · ${textos.publicaciones.tipos.preview}`,
  );
  const borradores = page.getByRole('region', { name: textos.inicio.borradores });
  await expect(borradores.getByRole('listitem')).toHaveText([textos.bloques.hero, textos.bloques.servicios]);

  await expect(page.getByRole('link', { name: textos.shell.sinPublicar(2) })).toBeVisible();

  // Cerrar sesión vuelve al login.
  await page.getByRole('button', { name: textos.shell.cerrarSesion }).click();
  await expect(page.getByRole('heading', { name: textos.login.titulo })).toBeVisible();
});

test('una contraseña incorrecta muestra el error y no entra', async ({ page }) => {
  await entrar(page, ADMIN, 'otra-cosa');
  await expect(page.getByRole('alert')).toHaveText(textos.login.errores.credenciales);
  await expect(page.getByLabel(textos.login.contrasena)).toHaveValue('');
  await expect(nav(page)).toHaveCount(0);
});

test('otra cuenta ve "Sin acceso" y se cierra su sesión', async ({ page }) => {
  await entrar(page, OTRA);

  const aviso = page.getByRole('alert');
  await expect(aviso).toContainText(textos.sinAcceso.titulo);
  await expect(aviso).toContainText(textos.sinAcceso.texto);
  await expect(page.getByRole('button', { name: textos.login.entrar })).toBeVisible();
  await expect(nav(page)).toHaveCount(0);

  // La sesión de verdad se cerró: no queda usuario guardado y al recargar sigue fuera.
  const guardada = await page.evaluate(() => Object.keys(sessionStorage).some((k) => k.startsWith('firebase:authUser')));
  expect(guardada).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: textos.login.entrar })).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
});

test('recargar en una ruta interna conserva la sesión y la página', async ({ page }) => {
  await entrar(page);
  await nav(page).getByRole('link', { name: textos.bloques.hero }).click();
  await expect(page).toHaveURL(/\/admin#\/contenido\/hero$/);
  await expect(titulo(page)).toHaveText(textos.bloques.hero);
  await expect(titulo(page)).toBeFocused();

  await page.reload();
  await expect(titulo(page)).toHaveText(textos.bloques.hero);
  await expect(nav(page).getByRole('link', { name: textos.bloques.hero })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle(`${textos.bloques.hero} · ${textos.tituloPagina}`);

  // Una ruta desconocida vuelve al inicio.
  await page.goto('/admin#/no-existe');
  await expect(titulo(page)).toHaveText(textos.inicio.titulo);
});

test.describe('a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la barra lateral es un menú', async ({ page }) => {
    await entrar(page);
    await expect(titulo(page)).toHaveText(textos.inicio.titulo);

    const boton = page.getByRole('button', { name: textos.shell.abrirMenu });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav(page)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    // Abre, y Escape lo cierra devolviendo el foco al botón.
    await boton.click();
    const cerrar = page.getByRole('button', { name: textos.shell.cerrarMenu });
    await expect(cerrar).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page)).toBeVisible();
    // El menú empieza debajo de la barra superior y llega al fondo (nada queda tapado).
    const barra = (await page.getByRole('banner').boundingBox())!;
    const menu = (await nav(page).boundingBox())!;
    expect(menu.y).toBeGreaterThanOrEqual(barra.y + barra.height - 1);
    expect(menu.y + menu.height).toBeLessThanOrEqual(844 + 1);
    await page.keyboard.press('Escape');
    await expect(nav(page)).toBeHidden();
    await expect(boton).toBeFocused();

    // Elegir una sección navega y cierra el menú.
    await boton.click();
    await nav(page).getByRole('link', { name: textos.bloques.proceso }).click();
    await expect(page).toHaveURL(/#\/contenido\/proceso$/);
    await expect(titulo(page)).toHaveText(textos.bloques.proceso);
    await expect(nav(page)).toBeHidden();

    // Cerrar sesión también está en el menú.
    await boton.click();
    await nav(page).getByRole('button', { name: textos.shell.cerrarSesion }).click();
    await expect(page.getByRole('heading', { name: textos.login.titulo })).toBeVisible();
  });
});

test('todo el recorrido funciona con teclado y el foco se ve', async ({ page }) => {
  /** Nombre visible del elemento con foco y si su contorno de foco es el dorado. */
  const foco = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const estilo = getComputedStyle(el);
      return {
        texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
        etiqueta: el.getAttribute('aria-label') ?? el.id,
        contorno: `${estilo.outlineStyle} ${estilo.outlineColor}`,
      };
    });

  // Login solo con teclado.
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: textos.login.entrar })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(textos.login.correo)).toBeFocused();
  await page.keyboard.type(ADMIN);
  await page.keyboard.press('Tab');
  await page.keyboard.type(CONTRASENA);
  await page.keyboard.press('Enter');
  await expect(titulo(page)).toBeFocused();

  // Hacia atrás desde el título hasta el enlace para saltar al contenido: todo se alcanza y el foco es dorado.
  const recorrido: string[] = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Shift+Tab');
    const actual = await foco();
    expect(actual.contorno, `foco visible en "${actual.texto}"`).toBe(`solid ${DORADO}`);
    recorrido.unshift(actual.texto);
    if (actual.texto === textos.saltarContenido) break;
  }
  const esperado = [
    textos.saltarContenido,
    `${textos.marca} ${textos.marcaAdmin}`,
    textos.shell.sinPublicar(2),
    textos.shell.cerrarSesion,
    textos.shell.inicio,
    ...Object.values(textos.bloques),
    textos.shell.cotizaciones,
    textos.shell.listaEspera,
    textos.shell.publicar,
  ];
  expect(recorrido.map((t, i) => (t.startsWith(esperado[i]) ? esperado[i] : t))).toEqual(esperado);

  // El enlace de salto se ve al enfocarlo y lleva el foco al contenido.
  const saltar = page.getByRole('link', { name: textos.saltarContenido });
  expect((await saltar.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  expect((await foco()).etiqueta).toBe('admin-principal');
  await expect(page).toHaveURL(/\/admin(#\/)?$/);

  // Con Tab hasta "Sitio" y Enter: navega y el foco va al título nuevo.
  await saltar.focus();
  for (let i = 0; i < 10 && (await foco()).texto !== textos.bloques.site; i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/contenido\/site$/);
  await expect(titulo(page)).toHaveText(textos.bloques.site);
  await expect(titulo(page)).toBeFocused();
});
