type LogoProps = {
  size?: "sm" | "md" | "lg";
  tone?: "dark" | "light";
  className?: string;
};

const SIZES = {
  sm: { text: "text-lg", dot: "size-[5px]", bracket: "size-2", inset: -7 },
  md: { text: "text-2xl", dot: "size-[7px]", bracket: "size-2.5", inset: -9 },
  lg: { text: "text-4xl", dot: "size-[10px]", bracket: "size-3.5", inset: -13 },
} as const;

export function Logo({ size = "md", tone = "dark", className = "" }: LogoProps) {
  const s = SIZES[size];
  const textColor = tone === "dark" ? "text-ink" : "text-paper";

  return (
    <span className={`relative inline-flex items-end ${className}`} aria-label="Aqui.">
      <span
        aria-hidden
        className={`absolute ${s.bracket} border-t-2 border-l-2 border-red`}
        style={{ left: s.inset, top: s.inset }}
      />
      <span className={`${s.text} ${textColor} font-black leading-none tracking-[-0.06em]`}>
        Aqui
      </span>
      <span className={`${s.dot} mb-[0.1em] ml-[0.1em] rounded-full bg-red`} aria-hidden />
      <span
        aria-hidden
        className={`absolute ${s.bracket} border-r-2 border-b-2 border-red`}
        style={{ right: s.inset, bottom: s.inset }}
      />
    </span>
  );
}
