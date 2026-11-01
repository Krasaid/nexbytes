import type { Env } from './env';
import { createHandler } from './handler';

export { LimiteSubidas } from './limite';

export default { fetch: createHandler() } satisfies ExportedHandler<Env>;
