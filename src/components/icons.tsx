type IconProps = { className?: string };

export function CheckCircle({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m6 10.2 2.7 2.6L14 7.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Check({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="m4 10.5 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRight({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Plus({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Close({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Download({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heart({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Comment({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 11.5C4 7.9 7.6 5 12 5s8 2.9 8 6.5S16.4 18 12 18c-.9 0-1.8-.1-2.6-.35L5 19l1.1-2.8C4.8 15.05 4 13.35 4 11.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Share({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M21 4 3 11l7 2.6L12.5 21 21 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Instagram({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function Facebook({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8h3.2Z"
      />
    </svg>
  );
}

export function ThumbUp({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 10.5v8.2H4.8A1.3 1.3 0 0 1 3.5 17.4v-5.6a1.3 1.3 0 0 1 1.3-1.3H7Zm0 0 3.9-6.6a1.5 1.5 0 0 1 2.8.9l-.6 3.6h4.5a2 2 0 0 1 2 2.4l-1.2 5.6a2.2 2.2 0 0 1-2.2 1.7H7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThumbUpSolid({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.6 10.2 11.4 3.8a1.5 1.5 0 0 1 2.8.9l-.6 3.6h4.3a2 2 0 0 1 2 2.4l-1.2 5.6a2.2 2.2 0 0 1-2.2 1.7H7.6V10.2ZM6.2 10.4v8.2H4.6a1.2 1.2 0 0 1-1.2-1.2v-5.8a1.2 1.2 0 0 1 1.2-1.2h1.6Z"
      />
    </svg>
  );
}

export function HeartSolid({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 20.2s-7.4-4.6-7.4-9.6a4.2 4.2 0 0 1 7.4-2.7 4.2 4.2 0 0 1 7.4 2.7c0 5-7.4 9.6-7.4 9.6Z"
      />
    </svg>
  );
}

export function LaughEmoji({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#f7b125" />
      <path d="M4.6 12.6h14.8a7.4 7.4 0 0 1-14.8 0Z" fill="#2a2a2a" />
      <path d="M7.5 15.6h9a7.4 7.4 0 0 1-9 0Z" fill="#f04f5f" />
      <path
        d="M6.4 8.2 9.8 9.6 6.4 11M17.6 8.2 14.2 9.6l3.4 1.4"
        stroke="#2a2a2a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SignalBars({ className = "size-3" }: IconProps) {
  return (
    <svg viewBox="0 0 18 12" className={className} aria-hidden>
      <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
      <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Wifi({ className = "size-3" }: IconProps) {
  return (
    <svg viewBox="0 0 16 12" fill="none" className={className} aria-hidden>
      <path
        d="M1 4.3a10.6 10.6 0 0 1 14 0M3.4 6.8a7 7 0 0 1 9.2 0M5.8 9.3a3.4 3.4 0 0 1 4.4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function Battery({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 26 12" fill="none" className={className} aria-hidden>
      <rect
        x="0.7"
        y="0.7"
        width="21"
        height="10.6"
        rx="3"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <rect x="2.4" y="2.4" width="17.6" height="7.2" rx="1.8" fill="currentColor" />
      <path
        d="M23.6 4.2v3.6a2 2 0 0 0 0-3.6Z"
        fill="currentColor"
        fillOpacity="0.45"
      />
    </svg>
  );
}

export function Dots({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="4" cy="10" r="1.4" fill="currentColor" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      <circle cx="16" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}
