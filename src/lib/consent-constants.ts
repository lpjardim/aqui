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

/**
 * Disparado (via `window.dispatchEvent`) sempre que a escolha de
 * consentimento muda — usado por `useMarketingConsentGranted` (Pixel,
 * trackers Meta) e pelo próprio banner para reagir sem recarregar a página.
 * Vive aqui (não em `cookie-banner.tsx`) para não haver uma dependência de
 * `src/lib/meta/` sobre um componente React.
 */
export const CONSENT_CHANGED_EVENT = "aqui:consent-changed";
