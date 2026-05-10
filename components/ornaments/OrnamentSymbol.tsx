"use client";

import type { CSSProperties } from "react";
import { getOrnament } from "@/lib/domain/ornaments";

interface OrnamentSymbolProps {
  value: number;
  className?: string;
  title?: string;
}

export function OrnamentSymbol({ value, className = "ornament-symbol", title }: OrnamentSymbolProps) {
  const ornament = getOrnament(value);
  const label = title ?? ornament?.kazakhName;
  const classes = className.includes("ornament-symbol") ? className : `ornament-symbol ${className}`;
  const style = {
    "--ornament-url": `url("${ornament?.assetPath ?? `/ornaments/ornament_${value}.svg`}")`
  } as CSSProperties;

  return (
    <span
      className={classes}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}
