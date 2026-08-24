/**
 * Ilustração conceptual, em traço fino, de um negócio local rodeado pelos
 * vários canais que o podem dar a conhecer. Desenhada à mão em SVG para não
 * parecer stock photography — decorativa, não informativa.
 */
export function ChannelsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 220"
      fill="none"
      className={className}
      role="img"
      aria-label="Ilustração de uma loja local rodeada por diferentes formas de ser descoberto: recomendações, Google, redes sociais e publicidade"
    >
      {/* linhas de ligação */}
      <g stroke="currentColor" className="text-line-strong" strokeWidth="1.4" strokeDasharray="3 4">
        <path d="M220 110 L60 45" />
        <path d="M220 110 L60 175" />
        <path d="M220 110 L220 20" />
        <path d="M220 110 L380 45" />
        <path d="M220 110 L380 175" />
      </g>

      {/* loja, ao centro */}
      <g transform="translate(190,82)">
        <path
          d="M2 20 60 2 118 20"
          stroke="currentColor"
          className="text-ink"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="8"
          y="20"
          width="104"
          height="56"
          rx="3"
          stroke="currentColor"
          className="text-ink"
          strokeWidth="2.2"
        />
        <rect
          x="50"
          y="42"
          width="20"
          height="34"
          stroke="currentColor"
          className="text-red"
          strokeWidth="2.2"
        />
        <path
          d="M8 20v10a12 12 0 0 0 24 0V20M32 20v10a12 12 0 0 0 24 0V20M56 20v10a12 12 0 0 0 24 0V20M80 20v10a12 12 0 0 0 24 0V20"
          stroke="currentColor"
          className="text-red"
          strokeWidth="2"
        />
      </g>

      {/* Google Maps pin */}
      <g transform="translate(46,18)">
        <circle cx="14" cy="14" r="14" className="fill-paper" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M14 7a5 5 0 0 1 5 5c0 3.6-5 9-5 9s-5-5.4-5-9a5 5 0 0 1 5-5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="12" r="1.7" fill="currentColor" />
      </g>

      {/* boca-a-boca */}
      <g transform="translate(46,148)">
        <circle cx="14" cy="14" r="14" className="fill-paper" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M6 11.5C6 8.5 8.9 6 12.5 6s6.5 2.5 6.5 5.5-2.9 5.5-6.5 5.5c-.6 0-1.2-.06-1.75-.2L7 18l.8-2.2C6.7 15 6 13.3 6 11.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>

      {/* Instagram / redes sociais */}
      <g transform="translate(206,-4)">
        <circle cx="14" cy="14" r="14" className="fill-paper" stroke="currentColor" strokeWidth="1.6" />
        <rect x="7.5" y="7.5" width="13" height="13" rx="3.6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="10" r="0.8" fill="currentColor" />
      </g>

      {/* publicidade física */}
      <g transform="translate(366,18)">
        <circle cx="14" cy="14" r="14" className="fill-paper" stroke="currentColor" strokeWidth="1.6" />
        <rect x="6" y="8" width="16" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 19v3M17 19v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* publicidade digital / distribuição */}
      <g transform="translate(366,148)">
        <circle cx="14" cy="14" r="14" className="fill-paper" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 17.5v-6l11-3.6v13.2l-11-3.6ZM9 11.5H6.5A1.5 1.5 0 0 0 5 13v3a1.5 1.5 0 0 0 1.5 1.5H9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M9.5 17.5l1 3.2h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
