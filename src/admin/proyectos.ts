/**
 * Orden de los proyectos (funciones puras, probadas en tests/unit/admin-slug.test.ts).
 * En el admin el orden es la posición en la lista:
 * - al cargar, la lista se ordena por `orden` (ordenarProyectos);
 * - al guardar, `orden` pasa a ser 1, 2, 3… según la lista (numerarProyectos).
 */
interface ConOrden {
  orden?: unknown;
}

type Contenido = Record<string, unknown>;

function conItems(contenido: Contenido, cambiar: (items: ConOrden[]) => ConOrden[]): Contenido {
  if (!Array.isArray(contenido.items)) return contenido;
  return { ...contenido, items: cambiar([...(contenido.items as ConOrden[])]) };
}

/** `orden` según la posición actual en la lista. */
export function numerarProyectos(contenido: Contenido): Contenido {
  return conItems(contenido, (items) => items.map((item, i) => ({ ...item, orden: i + 1 })));
}

/** Ordena por `orden` (estable: a igual orden se respeta la posición) y numera 1, 2, 3… */
export function ordenarProyectos(contenido: Contenido): Contenido {
  return numerarProyectos(
    conItems(contenido, (items) => items.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))),
  );
}
