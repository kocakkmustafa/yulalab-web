"use client";

import { useReveal } from "@/components/common/useReveal";

/** Title and description arrive localized from the server page. */
type Props = {
  index: number;
  title: string;
  description: string;
};

export function ValueCard({ index, title, description }: Props) {
  const reveal = useReveal();

  return (
    <div
      ref={reveal.ref as React.RefObject<HTMLDivElement>}
      className={
        "card-hover rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 hover:bg-white/[0.04] hover:border-white/15 " +
        reveal.className
      }
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10.5px] tracking-widest uppercase text-ink-400">
          0{index + 1}
        </span>
        <h3 className="font-display text-[22px] font-semibold tracking-tight text-ink-50">
          {title}
        </h3>
      </div>
      <p className="mt-3 text-[15px] text-ink-300 leading-[1.6] max-w-[40ch]">
        {description}
      </p>
    </div>
  );
}
