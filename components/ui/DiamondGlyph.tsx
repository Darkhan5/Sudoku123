"use client";

interface DiamondGlyphProps {
  className?: string;
  decorative?: boolean;
  label?: string;
}

export function DiamondGlyph({ className = "", decorative = true, label = "Алмаз" }: DiamondGlyphProps) {
  return (
    <span
      className={`diamond-glyph ${className}`}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
    >
      <span className="diamond-glyph-facet diamond-glyph-facet-left" />
      <span className="diamond-glyph-facet diamond-glyph-facet-right" />
      <span className="diamond-glyph-facet diamond-glyph-facet-mid" />
    </span>
  );
}
