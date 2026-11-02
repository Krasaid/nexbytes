import { describe, expect, it } from 'vitest';

import {
  escrituraEstado,
  escrituraSolicitud,
  mensajeDeError,
  mensajeLegible,
  resumirBuild,
} from '../../scripts/lib/publicacion.mjs';

const DOC = 'projects/nexbytes/databases/(default)/documents/publicaciones/abc123';

describe('escrituraEstado', () => {
  it('construyendo solo cambia el estado, sobre un documento que ya existe', () => {
    expect(escrituraEstado('nexbytes', 'abc123', { estado: 'construyendo' })).toEqual({
      update: { name: DOC, fields: { estado: { stringValue: 'construyendo' } } },
      updateMask: { fieldPaths: ['estado'] },
      currentDocument: { exists: true },
    });
  });

  it('publicada guarda la URL y terminadaEn con la hora del servidor', () => {
    const w = escrituraEstado('nexbytes', 'abc123', { estado: 'publicada', url: 'https://x.web.app' });
    expect(w.update.fields.url).toEqual({ stringValue: 'https://x.web.app' });
    expect(w.updateMask.fieldPaths).toEqual(['estado', 'url']);
    expect(w.updateTransforms).toEqual([{ fieldPath: 'terminadaEn', setToServerValue: 'REQUEST_TIME' }]);
  });

  it('error guarda el mensaje y terminadaEn', () => {
    const w = escrituraEstado('nexbytes', 'abc123', { estado: 'error', error: 'Fallaron las pruebas.' });
    expect(w.updateMask.fieldPaths).toEqual(['estado', 'error']);
    expect(w.updateTransforms).toHaveLength(1);
  });

  it('rechaza IDs que podrían salirse de la colección', () => {
    for (const id of ['', '../borradores/hero', 'a/b', 'x'.repeat(65)]) {
      expect(() => escrituraEstado('nexbytes', id, { estado: 'construyendo' })).toThrow('publicacionId inválido');
    }
  });
});

describe('escrituraSolicitud', () => {
  it('crea una solicitud como la del admin y no pisa una existente', () => {
    const w = escrituraSolicitud('nexbytes', 'abc123', 'preview');
    expect(w.update.fields).toEqual({ estado: { stringValue: 'solicitada' }, tipo: { stringValue: 'preview' } });
    expect(w.currentDocument).toEqual({ exists: false });
    expect(w.updateTransforms).toEqual([{ fieldPath: 'solicitadaEn', setToServerValue: 'REQUEST_TIME' }]);
  });

  it('rechaza un tipo desconocido', () => {
    expect(() => escrituraSolicitud('nexbytes', 'abc123', 'staging')).toThrow('tipo');
  });
});

describe('mensajeLegible', () => {
  it('quita colores, saltos de línea y espacios de más', () => {
    expect(mensajeLegible('\u001b[31mError:\u001b[39m algo\n   salió   mal\n')).toBe('Error: algo salió mal');
  });

  it('oculta tokens y llaves', () => {
    const texto = 'token ya29.a0AfB_xyz y -----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY----- fin';
    expect(mensajeLegible(texto)).toBe('token [oculto] y [oculto] fin');
  });

  it('corta los mensajes largos con "…"', () => {
    const corto = mensajeLegible('x'.repeat(500));
    expect(Array.from(corto)).toHaveLength(300);
    expect(corto.endsWith('…')).toBe(true);
  });
});

describe('mensajeDeError', () => {
  const enlace = 'https://github.com/nexbytes/nexbytes/actions/runs/123';

  it('une motivo, resumen y enlace', () => {
    expect(mensajeDeError('El build falló.', 'Faltan bloques: hero', enlace)).toBe(
      `El build falló. Faltan bloques: hero Detalle: ${enlace}`,
    );
  });

  it('si hay que cortar, corta el texto y conserva el enlace completo', () => {
    const m = mensajeDeError('El build falló.', 'x'.repeat(400), enlace);
    expect(Array.from(m).length).toBeLessThanOrEqual(300);
    expect(m.endsWith(`… Detalle: ${enlace}`)).toBe(true);
  });

  it('sin motivo usa uno genérico', () => {
    expect(mensajeDeError('')).toBe('El despliegue falló.');
  });
});

describe('resumirBuild', () => {
  it('extrae el bloque inválido y sus primeros campos', () => {
    const log = [
      '11:04:59 [build] generando páginas',
      '\u001b[31m[ERROR]\u001b[39m Error: Contenido inválido en Firestore publicado/hero',
      '  • titulo: Demasiado pequeño',
      '  • subtitulo: Requerido',
      '    at validarBloque (file:///C:/x/content.mjs:612:8)',
    ].join('\n');
    expect(resumirBuild(log)).toBe(
      'Contenido inválido en Firestore publicado/hero • titulo: Demasiado pequeño • subtitulo: Requerido',
    );
  });

  it('reconoce los bloques que faltan', () => {
    expect(resumirBuild('[ERROR] Faltan bloques en Firestore borradores/: hero, site.')).toBe(
      'Faltan bloques en Firestore borradores/: hero, site.',
    );
  });

  it('devuelve vacío si no hay nada reconocible', () => {
    expect(resumirBuild('npm ERR! algo raro')).toBe('');
  });
});
