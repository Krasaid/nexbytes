/**
 * Límite de subidas por UID: un Durable Object por cuenta (idFromName(uid)).
 * Ventana fija (por defecto, 60 subidas por hora). El objeto atiende una
 * petición a la vez, así que la cuenta es exacta aunque lleguen subidas en paralelo.
 * (El binding de Rate Limiting de Cloudflare solo admite ventanas de 10 o 60 s.)
 */
import { DurableObject } from 'cloudflare:workers';

interface Ventana {
  inicio: number;
  cuenta: number;
}

export interface Resultado {
  permitido: boolean;
  /** Segundos hasta que se abre la siguiente ventana (solo si no se permite). */
  reintentarEn: number;
}

export class LimiteSubidas extends DurableObject {
  async consumir(maximo: number, ventanaMs: number): Promise<Resultado> {
    const ahora = Date.now();
    let ventana = await this.ctx.storage.get<Ventana>('ventana');
    if (!ventana || ahora - ventana.inicio >= ventanaMs) ventana = { inicio: ahora, cuenta: 0 };
    if (ventana.cuenta >= maximo) {
      return { permitido: false, reintentarEn: Math.max(1, Math.ceil((ventana.inicio + ventanaMs - ahora) / 1000)) };
    }
    ventana.cuenta++;
    await this.ctx.storage.put('ventana', ventana);
    return { permitido: true, reintentarEn: 0 };
  }
}
