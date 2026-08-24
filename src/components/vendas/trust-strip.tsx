import { CheckCircle } from "@/components/icons";

const ITEMS = [
  "Instagram + Facebook",
  "Segmentação local",
  "Acompanhamento online",
  "Comprovativo Meta",
];

export function TrustStrip() {
  return (
    <div className="border-b border-line">
      <ul className="container-page grid gap-4 py-5 sm:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item} className="flex items-center justify-center gap-2 text-[14px]">
            <CheckCircle className="size-5 text-red-strong" />
            <span className="font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
