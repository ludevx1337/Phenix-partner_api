import { cn } from "@/lib/utils";

type OperatorKind = "orange" | "btbd" | "text";

function classify(operateur: string | null | undefined): OperatorKind {
  const u = (operateur ?? "").trim().toUpperCase();
  if (u === "ORANGE" || u === "ORA") return "orange";
  if (
    u === "BTBD" ||
    u.includes("BOUYGUES") ||
    u.includes("BOUYGTEL") ||
    u.includes("B&YOU") ||
    u === "BYOU"
  ) {
    return "btbd";
  }
  return "text";
}

/** Carré Orange (marque reconnaissable, non officielle). */
function OrangeMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={22}
      height={22}
      viewBox="0 0 22 22"
      role="img"
      aria-label="Orange"
    >
      <title>Orange</title>
      <rect
        x="2"
        y="2"
        width="18"
        height="18"
        rx="3.5"
        fill="#FF7900"
      />
    </svg>
  );
}

/**
 * Carré pavé par exactement 3 triangles (partition du carré) :
 * — bleu ciel : triangle nord-est (haut + côté droit)
 * — bleu foncé : triangle sud-ouest (bas gauche)
 * — orange : triangle sud-est (bas droit)
 * Diagonale TL→BR puis point milieu du bas ; non logo officiel Bouygues.
 */
function BouyguesStyleMark({ className }: { className?: string }) {
  const rx = 2.6;
  const ry = 5.8;

  return (
    <svg
      className={cn("shrink-0", className)}
      width={22}
      height={22}
      viewBox="0 0 22 22"
      role="img"
      aria-label="Bouygues Telecom"
    >
      <title>Bouygues Telecom</title>

      <rect x="1" y="1" width="20" height="20" rx="4" fill="white" />

      {/* Gauche : \ bleu foncé */}
      <ellipse
        cx="5.7"
        cy="13.2"
        rx={rx}
        ry={ry}
        transform="rotate(-25 5.7 13.2)"
        fill="#0D4F8C"
      />

      {/* Haut : --- bleu clair, même taille que les autres */}
      <ellipse
        cx="11"
        cy="6"
        rx={ry}
        ry={rx}
        fill="#8FD4F5"
      />

      {/* Droite : / orange */}
      <ellipse
        cx="16.3"
        cy="13.2"
        rx={rx}
        ry={ry}
        transform="rotate(25 16.3 13.2)"
        fill="#F47920"
      />

      <rect
        x="1"
        y="1"
        width="20"
        height="20"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.12}
        strokeWidth={0.5}
        className="text-foreground"
      />
    </svg>
  );
}

type Props = {
  operateur: string | null | undefined;
  className?: string;
};

/**
 * Pictogramme opérateur pour le tableau : Orange (carré), BTBD / Bouygues (triangles).
 */
export function OperatorMark({ operateur, className }: Props) {
  const kind = classify(operateur);

  if (kind === "orange") {
    return (
      <span className={cn("inline-flex items-center justify-center", className)}>
        <OrangeMark />
      </span>
    );
  }

  if (kind === "btbd") {
    return (
      <span className={cn("inline-flex items-center justify-center", className)}>
        <BouyguesStyleMark />
      </span>
    );
  }

  return (
    <span className={cn("text-muted-foreground text-sm", className)}>
      {operateur?.trim() ? operateur : "—"}
    </span>
  );
}
