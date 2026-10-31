import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ADMIN_UID, bloquesSinPublicar, esAdmin } from '../../src/admin/acceso';

describe('esAdmin', () => {
  it('usa el mismo UID que firestore.rules', () => {
    const reglas = readFileSync('firestore.rules', 'utf8');
    expect(reglas).toContain(`request.auth.uid == '${ADMIN_UID}'`);
  });

  it('solo acepta ese UID', () => {
    expect(esAdmin(ADMIN_UID)).toBe(true);
    expect(esAdmin('otro-uid')).toBe(false);
    expect(esAdmin(null)).toBe(false);
    expect(esAdmin(undefined)).toBe(false);
  });
});

describe('bloquesSinPublicar', () => {
  it('marca los borradores con version mayor que lo publicado, en el orden de los bloques', () => {
    expect(bloquesSinPublicar({ site: 4, hero: 3, nosotros: 2 }, { site: 4, hero: 2, nosotros: 1 })).toEqual([
      'hero',
      'nosotros',
    ]);
  });

  it('un borrador que nunca se publicó cuenta como pendiente', () => {
    expect(bloquesSinPublicar({ proceso: 1 }, {})).toEqual(['proceso']);
  });

  it('sin borrador no hay nada que publicar, y versiones raras no cuentan', () => {
    expect(bloquesSinPublicar({}, { hero: 3 })).toEqual([]);
    expect(bloquesSinPublicar({ hero: '5', site: null }, { hero: 1 })).toEqual([]);
  });

  it('todo al día devuelve una lista vacía', () => {
    expect(bloquesSinPublicar({ site: 2, hero: 2 }, { site: 2, hero: 2 })).toEqual([]);
  });
});
