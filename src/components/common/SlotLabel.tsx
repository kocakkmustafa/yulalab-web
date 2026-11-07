/**
 * Button label that rolls up to a second copy of itself on hover. The copy is
 * CSS generated content with an empty alternative text (`/ ""`), so the
 * accessible name and textContent stay the single, real label.
 */
export function SlotLabel({ children }: { children: string }) {
  return (
    <span className="slot" data-slot={children}>
      <span>{children}</span>
    </span>
  );
}
