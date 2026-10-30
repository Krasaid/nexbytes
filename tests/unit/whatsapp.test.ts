import { describe, expect, it } from 'vitest';
import cotizador from '../../src/content/data/cotizador.json';
import {
  buildQuoteMessage,
  buildWaLink,
  createQuoteRef,
  IDEA_MAX,
  normalizeWaNumber,
  truncate,
  type QuoteMessageData,
} from '../../src/lib/whatsapp';

const PLANTILLA = '*Ref:* {ref}\n*Tipo:* {tipo}\n*Funciones:* {funciones}\n*Negocio:* {negocio}\n*Idea:* {idea}';

const completa: QuoteMessageData = {
  ref: 'NX-AB12',
  tipo: 'Tienda en línea',
  funciones: ['Pagos en línea', 'Facturación'],
  plazo: 'En 1 a 2 meses',
  presupuesto: 'Prefiero que me asesoren',
  nombre: 'José Peña',
  negocio: 'Café Ñandú',
  idea: 'Vender café en línea',
};

describe('normalizeWaNumber', () => {
  it('agrega 503 a los números locales de 8 dígitos', () => {
    expect(normalizeWaNumber('7000-1234')).toBe('50370001234');
    expect(normalizeWaNumber('7000 1234')).toBe('50370001234');
  });

  it('deja el número si ya trae código de país', () => {
    expect(normalizeWaNumber('+503 7000 1234')).toBe('50370001234');
    expect(normalizeWaNumber('(503) 7000-1234')).toBe('50370001234');
  });

  it('rechaza placeholders y números incompletos', () => {
    expect(normalizeWaNumber('[WHATSAPP]')).toBeUndefined();
    expect(normalizeWaNumber('7000')).toBeUndefined();
    expect(normalizeWaNumber('')).toBeUndefined();
  });
});

describe('buildQuoteMessage', () => {
  it('llena todos los marcadores', () => {
    expect(buildQuoteMessage(PLANTILLA, completa)).toBe(
      '*Ref:* NX-AB12\n*Tipo:* Tienda en línea\n*Funciones:* Pagos en línea, Facturación\n*Negocio:* Café Ñandú\n*Idea:* Vender café en línea',
    );
  });

  it('omite las líneas de campos vacíos', () => {
    const msg = buildQuoteMessage(PLANTILLA, { ...completa, ref: '', funciones: [], negocio: '  ', idea: undefined });
    expect(msg).toBe('*Tipo:* Tienda en línea');
  });

  it('no deja separadores dobles al omitir líneas', () => {
    const msg = buildQuoteMessage('Hola\n\n*Ref:* {ref}\n\n*Tipo:* {tipo}', { ...completa, ref: '' });
    expect(msg).toBe('Hola\n\n*Tipo:* Tienda en línea');
  });

  it('recorta la idea a 500 caracteres', () => {
    const msg = buildQuoteMessage('{idea}', { ...completa, idea: 'a'.repeat(800) });
    expect(Array.from(msg)).toHaveLength(IDEA_MAX);
    expect(msg.endsWith('…')).toBe(true);
  });

  it('no vuelve a sustituir marcadores escritos por el usuario', () => {
    const msg = buildQuoteMessage('*Idea:* {idea}', { ...completa, idea: 'mi {ref} y {nombre}' });
    expect(msg).toBe('*Idea:* mi {ref} y {nombre}');
  });

  it('junta en una línea los saltos de línea del usuario', () => {
    const msg = buildQuoteMessage('*Idea:* {idea}', { ...completa, idea: 'línea 1\n\nlínea 2' });
    expect(msg).toBe('*Idea:* línea 1 línea 2');
  });

  it('deja intactos los marcadores desconocidos', () => {
    expect(buildQuoteMessage('{otro} {tipo}', completa)).toBe('{otro} Tienda en línea');
  });

  it('funciona con la plantilla real de cotizador.json', () => {
    const msg = buildQuoteMessage(cotizador.plantillaWhatsapp, completa);
    for (const valor of ['NX-AB12', 'Tienda en línea', 'Pagos en línea, Facturación', 'José Peña', 'Café Ñandú']) {
      expect(msg).toContain(valor);
    }
    expect(msg).not.toMatch(/\{(ref|tipo|funciones|plazo|presupuesto|nombre|negocio|idea)\}/);
  });
});

describe('truncate', () => {
  it('no parte emojis', () => {
    expect(truncate('😀😀😀', 2)).toBe('😀…');
  });
});

describe('buildWaLink', () => {
  it('arma el link wa.me con el texto codificado (acentos, saltos y negritas)', () => {
    const msg = '*Tipo:* Tienda en línea\nÑandú & café?';
    const link = buildWaLink('7000 1234', msg);
    expect(link).toBe(`https://wa.me/50370001234?text=${encodeURIComponent(msg)}`);
    expect(new URL(link!).searchParams.get('text')).toBe(msg);
  });

  it('sin mensaje devuelve el link simple', () => {
    expect(buildWaLink('+503 7000 1234')).toBe('https://wa.me/50370001234');
  });

  it('sin número válido devuelve undefined', () => {
    expect(buildWaLink('[WHATSAPP]', 'hola')).toBeUndefined();
  });
});

describe('createQuoteRef', () => {
  it('tiene el formato NX- + 4 caracteres en mayúscula', () => {
    for (let i = 0; i < 200; i++) expect(createQuoteRef()).toMatch(/^NX-[A-Z0-9]{4}$/);
  });

  it('usa la fuente aleatoria que recibe', () => {
    expect(createQuoteRef(() => new Uint8Array([0, 1, 2, 3]))).toBe('NX-ABCD');
  });
});
