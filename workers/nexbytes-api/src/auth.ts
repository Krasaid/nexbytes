/**
 * Verificación del ID token de Firebase (tomada del Worker del portafolio).
 * Firma con las llaves públicas de Google, `iss` y `aud` del proyecto, sin
 * vencer, y el `sub` tiene que ser el UID de administración.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

// jose guarda en caché las llaves públicas de Google, nunca el token del usuario.
const llavesDeGoogle = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verificarToken(
  token: string,
  projectId: string,
  adminUid: string,
  llaves: JWTVerifyGetKey = llavesDeGoogle,
): Promise<string> {
  if (!projectId || !adminUid) throw new Error('Falta la configuración de autenticación');
  const { payload } = await jwtVerify(token, llaves, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
    clockTolerance: 5,
  });
  const ahora = Math.floor(Date.now() / 1000);
  if (
    payload.sub !== adminUid ||
    typeof payload.iat !== 'number' ||
    payload.iat > ahora + 5 ||
    typeof payload.auth_time !== 'number' ||
    payload.auth_time > ahora + 5
  ) {
    throw new Error('Cuenta no autorizada');
  }
  return payload.sub;
}
