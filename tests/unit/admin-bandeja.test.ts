import { describe, expect, it } from 'vitest';

import {
  csvListaEspera,
  enlaceCorreo,
  enlaceWhatsapp,
  fechaRelativa,
  interpretarBusqueda,
  saludo,
} from '../../src/admin/bandeja';
import { textos } from '../../src/admin/textos';

describe('interpretarBusqueda', () => {
  it('reconoce un ref con o sin prefijo, mayúsculas o espacios', () => {
    for (const texto of ['NX-AB12', 'nx-ab12', 'nx ab12', 'NXAB12', 'ab12', ' AB12 ']) {
      expect(interpretarBusqueda(texto)).toEqual({ tipo: 'ref', ref: 'NX-AB12' });
    }
  });

  it('un nombre de 4 letras no se confunde con un ref', () => {
    expect(interpretarBusqueda('juan')).toEqual({ tipo: 'nombre', desde: 'Juan', hasta: 'Juan' });
  });

  it('busca el nombre por cómo empieza, con mayúscula inicial en cada palabra', () => {
    expect(interpretarBusqueda('maría ló')).toEqual({ tipo: 'nombre', desde: 'María Ló', hasta: 'María Ló' });
  });

  it('vacío: sin búsqueda', () => {
    expect(interpretarBusqueda('   ')).toBeNull();
  });
});

describe('fechaRelativa', () => {
  const ahora = Date.parse('2026-10-31T12:00:00Z');
  const hace = (s: number) => new Date(ahora - s * 1000);

  it('en español y con la unidad que corresponde', () => {
    expect(fechaRelativa(hace(20), ahora)).toBe(textos.bandeja.justoAhora);
    expect(fechaRelativa(hace(5 * 60), ahora)).toBe('hace 5 minutos');
    expect(fechaRelativa(hace(3 * 3600), ahora)).toBe('hace 3 horas');
    expect(fechaRelativa(hace(86_400), ahora)).toBe('ayer');
    expect(fechaRelativa(hace(10 * 86_400), ahora)).toBe('hace 10 días');
    expect(fechaRelativa(hace(90 * 86_400), ahora)).toBe('hace 3 meses');
    expect(fechaRelativa(hace(800 * 86_400), ahora)).toBe('hace 2 años');
  });
});

describe('contacto con el cliente', () => {
  const cot = { nombre: 'María López', ref: 'NX-AB12', whatsapp: '7000 1234', correo: 'maria@cafe.com' };

  it('el saludo usa el primer nombre e incluye el ref', () => {
    expect(saludo(cot)).toBe(textos.bandeja.saludo('María', 'NX-AB12'));
    expect(saludo(cot)).toContain('NX-AB12');
  });

  it('WhatsApp: wa.me con el número normalizado (503) y el saludo', () => {
    const url = new URL(enlaceWhatsapp(cot)!);
    expect(url.origin + url.pathname).toBe('https://wa.me/50370001234');
    expect(url.searchParams.get('text')).toBe(saludo(cot));
  });

  it('sin número válido no hay enlace', () => {
    expect(enlaceWhatsapp({ ...cot, whatsapp: '' })).toBeUndefined();
    expect(enlaceWhatsapp({ ...cot, whatsapp: '123' })).toBeUndefined();
  });

  it('mailto: con asunto y saludo, solo si dejó un correo válido', () => {
    const enlace = enlaceCorreo(cot)!;
    expect(enlace.startsWith('mailto:maria@cafe.com?')).toBe(true);
    const params = new URLSearchParams(enlace.split('?')[1]);
    expect(params.get('subject')).toBe(textos.bandeja.asuntoCorreo('NX-AB12'));
    expect(params.get('body')).toBe(saludo(cot));
    expect(enlaceCorreo({ ...cot, correo: '' })).toBeUndefined();
    expect(enlaceCorreo({ ...cot, correo: 'no-es-correo' })).toBeUndefined();
  });
});

describe('csvListaEspera', () => {
  it('empieza con BOM UTF-8, usa CRLF y conserva las tildes', () => {
    const csv = csvListaEspera([{ email: 'josé@peña.sv', estado: 'invitado', creadoEn: new Date(2026, 9, 31, 14, 5) }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split('\r\n')).toEqual([
      textos.bandeja.csvEncabezado.join(','),
      `josé@peña.sv,${textos.bandeja.estadosLista.invitado},2026-10-31 14:05`,
      '',
    ]);
  });

  it('escapa comillas y comas, y neutraliza fórmulas de hoja de cálculo', () => {
    const csv = csvListaEspera([
      { email: 'a,"b"@x.com', estado: 'nuevo' },
      { email: '=HYPERLINK("x")', estado: 'baja' },
    ]);
    const filas = csv.slice(1).split('\r\n');
    expect(filas[1]).toBe(`"a,""b""@x.com",${textos.bandeja.estadosLista.nuevo},`);
    expect(filas[2]).toBe(`"'=HYPERLINK(""x"")",${textos.bandeja.estadosLista.baja},`);
  });
});
