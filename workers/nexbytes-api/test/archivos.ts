/**
 * Imágenes reales de 16×16 para las pruebas (generadas una vez con sharp).
 * En base64 porque las pruebas corren en el runtime de Workers, sin fs.
 */
const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** WebP real: RIFF....WEBP */
export const WEBP = bytes('UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoQABAAAUAmJaACdLoABGaAAP7wYC//Z3f/Tu/+nd/gY/3BmfV1/gAA');

/** AVIF real: caja ftyp con marca avif */
export const AVIF = bytes('AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAHgAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAABAAAAAQAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAmbWRhdBIACgg4DP/YQENBpDIQGAAAAEAAqYzPikVh2iAToA==');

/** PNG real, para hacerlo pasar por WebP */
export const PNG = bytes('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGUlEQVR4nGO4st6cJMQwqmH9aChdGa5JAwCXu7oQRckvngAAAABJRU5ErkJggg==');
