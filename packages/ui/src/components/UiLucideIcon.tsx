'use client';

import React from 'react';
import * as Lucide from 'lucide-react-native';

type LucideModule = typeof Lucide;

export type UiLucideIconProps = {
  name: string;
  size: number;
  color: string;
  strokeWidth?: number;
};

/**
 * Rend une icône Lucide par nom (PascalCase). Repli : Swords si le nom est inconnu.
 */
export function UiLucideIcon({ name, size, color, strokeWidth = 2 }: UiLucideIconProps) {
  const mod = Lucide as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
  const C = mod[name];
  if (C && typeof C === 'function') {
    return <C size={size} color={color} strokeWidth={strokeWidth} />;
  }
  const Fallback = Lucide.Swords;
  return <Fallback size={size} color={color} strokeWidth={strokeWidth} />;
}
