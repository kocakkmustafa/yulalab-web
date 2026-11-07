/**
 * An oversized outlined word that drifts sideways behind a page's opening,
 * and runs faster while the page scrolls where scroll-driven animation is
 * supported. Pure CSS: no script, nothing on the main thread. Decorative, so
 * it is hidden from assistive technology; the readable title is the h1.
 */
export function ScrollMarquee({ text, className = "" }: { text: string; className?: string }) {
  const copies = Array.from({ length: 6 }, (_, index) => index);
  return (
    <div aria-hidden="true" className={"scroll-marquee " + className} dir="ltr" data-scroll-marquee="true">
      <div className="scroll-marquee-scroll">
        <div className="scroll-marquee-track">
          {copies.map((index) => (
            <span key={index}>{text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
