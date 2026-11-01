/** Bindings, variables (wrangler.jsonc) y secretos (wrangler secret put / .dev.vars) del Worker. */
import type { LimiteSubidas } from './limite';

export interface Env {
  BUCKET: R2Bucket;
  LIMITE_SUBIDAS: DurableObjectNamespace<LimiteSubidas>;
  /** Subidas permitidas por cuenta en una hora. */
  SUBIDAS_POR_HORA: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  /** UID de la cuenta de administración (el mismo de firestore.rules). */
  ADMIN_UID: string;
  /** "dueño/repo" en GitHub. Sin él (o sin token), /publish responde 503. */
  GITHUB_REPO?: string;
  /** Token fine-grained con permiso Contents: write solo en este repo. */
  GITHUB_TOKEN?: string;
}
