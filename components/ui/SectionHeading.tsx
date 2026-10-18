import type { ReactNode } from "react";

interface SectionHeadingProps {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
}

export default function SectionHeading({ index, eyebrow, title, lede, aside }: SectionHeadingProps) {
  return (
    <div className="mb-14 grid gap-8 md:mb-20 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <div data-reveal className="mb-6 flex items-center gap-4">
          <span className="section-index">{index}</span>
          <span className="h-px w-10 bg-neon/50" />
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 data-reveal className="max-w-4xl text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h2>
        {lede && (
          <p data-reveal className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-mute sm:text-lg">
            {lede}
          </p>
        )}
      </div>
      {aside && <div data-reveal>{aside}</div>}
    </div>
  );
}
