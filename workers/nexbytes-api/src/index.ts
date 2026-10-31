import type { Env } from './env';
import { createHandler } from './handler';

export default { fetch: createHandler() } satisfies ExportedHandler<Env>;
