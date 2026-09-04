/**
 * Repères d'angle façon "plan technique" (S29, design "Relais") — 4
 * petits traits en L posés aux coins d'un conteneur `position: relative`.
 * Purement décoratif (`aria-hidden`), à poser en premier enfant du
 * conteneur qui porte la classe `blueprint`.
 */
export function BlueprintCorners() {
  return (
    <>
      <span aria-hidden className="blueprint-corner blueprint-corner-tl" />
      <span aria-hidden className="blueprint-corner blueprint-corner-tr" />
      <span aria-hidden className="blueprint-corner blueprint-corner-bl" />
      <span aria-hidden className="blueprint-corner blueprint-corner-br" />
    </>
  );
}
