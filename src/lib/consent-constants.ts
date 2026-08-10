/**
 * Constantes puras (sem `next/headers`) partilhadas entre código de servidor
 * (`src/lib/consent.ts`) e componentes cliente (banner, Pixel) — separado
 * para que componentes cliente nunca puxem `next/headers` para o bundle do
 * browser.
 */
export const CONSENT_COOKIE = "aqui_consent";
export const CONSENT_GRANTED = "granted";
export const CONSENT_DENIED = "denied";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
