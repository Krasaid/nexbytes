import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { OBLIGATORIAS, SOLO_DESARROLLO, revisarVariables } from '../../scripts/lib/variables-publicas.mjs';

const NOMBRES = OBLIGATORIAS.map((v) => v.nombre);

const completas: Record<string, string> = {
  PUBLIC_CDN_URL: 'https://cdn.ejemplo.com',
  PUBLIC_FIREBASE_API_KEY: 'clave',
  PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  PUBLIC_FIREBASE_PROJECT_ID: 'demo',
  PUBLIC_FIREBASE_APP_ID: '1:2:web:3',
  PUBLIC_RECAPTCHA_SITE_KEY: 'sitio',
  PUBLIC_API_URL: 'https://api.ejemplo.workers.dev',
};

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

describe('revisarVariables', () => {
  it('acepta la configuración completa', () => {
    expect(revisarVariables(completas)).toEqual([]);
  });

  it('nombra cada variable que falta o está vacía', () => {
    const { PUBLIC_API_URL: _api, ...sinApi } = completas;
    expect(revisarVariables({ ...sinApi, PUBLIC_RECAPTCHA_SITE_KEY: '  ' })).toEqual([
      'PUBLIC_RECAPTCHA_SITE_KEY: falta o está vacía',
      'PUBLIC_API_URL: falta o está vacía',
    ]);
  });

  it('exige URL http(s) donde la CSP usa el origen', () => {
    expect(revisarVariables({ ...completas, PUBLIC_API_URL: 'nexbytes-api.workers.dev' })).toEqual([
      'PUBLIC_API_URL: no es una URL http(s) válida',
    ]);
    expect(revisarVariables({ ...completas, PUBLIC_CDN_URL: 'javascript:alert(1)' })).toHaveLength(1);
  });
});

describe('la lista está completa', () => {
  it('toda PUBLIC_* que usa src/ está en scripts/lib/variables-publicas.mjs', () => {
    const declaradas = new Set<string>([...NOMBRES, ...SOLO_DESARROLLO]);
    const usadas = new Set(
      archivos('src')
        .filter((r) => /\.(ts|vue|astro|mjs|js)$/.test(r))
        .flatMap((r) => readFileSync(r, 'utf8').match(/\bPUBLIC_[A-Z0-9_]+/g) ?? []),
    );
    expect([...usadas].filter((v) => !declaradas.has(v))).toEqual([]);
  });

  it('.env.example trae todas las obligatorias', () => {
    const ejemplo = readFileSync('.env.example', 'utf8');
    expect(NOMBRES.filter((v) => !new RegExp(`^${v}=`, 'm').test(ejemplo))).toEqual([]);
  });
});

describe('scripts/variables-ci.mjs', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'nexbytes-vars-'));
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }));

  function correr(variables: Record<string, string>) {
    const githubEnv = join(carpeta, `env-${Math.random().toString(36).slice(2)}`);
    const r = spawnSync(process.execPath, ['scripts/variables-ci.mjs'], {
      env: { PATH: process.env.PATH, VARIABLES: JSON.stringify(variables), GITHUB_ENV: githubEnv },
      encoding: 'utf8',
    });
    let escrito = '';
    try {
      escrito = readFileSync(githubEnv, 'utf8');
    } catch {
      // No se escribió nada.
    }
    return { status: r.status, salida: r.stdout, escrito };
  }

  it('pasa todas las PUBLIC_* (aunque no estén en la lista) y omite las de desarrollo y las demás', () => {
    const r = correr({ ...completas, PUBLIC_NUEVA: 'x', PUBLIC_AUTH_EMULATOR: '127.0.0.1:9099', OTRA: 'y' });
    expect(r.status).toBe(0);
    expect(r.escrito).toContain('PUBLIC_API_URL=https://api.ejemplo.workers.dev\n');
    expect(r.escrito).toContain('PUBLIC_NUEVA=x\n');
    expect(r.escrito).not.toContain('EMULATOR');
    expect(r.escrito).not.toContain('OTRA');
  });

  it('falla con el nombre de la variable y no escribe nada', () => {
    const { PUBLIC_API_URL: _api, ...sinApi } = completas;
    const r = correr(sinApi);
    expect(r.status).toBe(1);
    expect(r.salida).toContain('::error::');
    expect(r.salida).toContain('PUBLIC_API_URL');
    expect(r.escrito).toBe('');
  });

  it('rechaza saltos de línea (inyección en GITHUB_ENV)', () => {
    const r = correr({ ...completas, PUBLIC_RECAPTCHA_SITE_KEY: 'a\nCONTENT_SOURCE=local' });
    expect(r.status).toBe(1);
    expect(r.escrito).toBe('');
  });
});
