'use client';

import {
  Sun,
  CloudRain,
  Cloud,
  CloudSnow,
  CloudFog,
  CloudSun,
  CloudLightning,
  MapPin,
  Brain,
  Swords,
  Flower,
  Building2,
  Sparkles,
  Camera,
  Coffee,
  Mic,
  Shield,
  Check,
  Map,
  Dices,
  ClipboardList,
  Home,
  Globe,
  Clock,
  TreePine,
  AlertTriangle,
  Target,
  Leaf,
  Moon,
  Zap,
  Flame,
  Compass,
  BookOpen,
  UtensilsCrossed,
  Drama,
  Navigation,
  Frown,
  Share2,
  Users,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

const SIZE_CLASS = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
} as const;

const WEATHER_ICONS: Record<string, LucideIcon> = {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
};
const QUEST_ICONS: Record<string, LucideIcon> = {
  Swords,
  Camera,
  Coffee,
  Mic,
  Compass,
  Sparkles,
  TreePine,
  MapPin,
  Target,
  BookOpen,
  UtensilsCrossed,
  Drama,
  Leaf,
  Zap,
  Flame,
  Navigation,
  Flower,
  Building2,
  Globe,
  Home,
};
const UI_ICONS: Record<string, LucideIcon> = {
  MapPin,
  Brain,
  Swords,
  Flower,
  Building2,
  Sparkles,
  Camera,
  Coffee,
  Mic,
  Shield,
  Check,
  Map,
  Dices,
  ClipboardList,
  Home,
  Globe,
  Clock,
  TreePine,
  AlertTriangle,
  Target,
  Leaf,
  Moon,
  Zap,
  Flame,
  Frown,
  Share2,
  Users,
  MessageCircle,
};

export type IconName = keyof typeof UI_ICONS | keyof typeof QUEST_ICONS | keyof typeof WEATHER_ICONS;

const ALL_ICONS = { ...WEATHER_ICONS, ...QUEST_ICONS, ...UI_ICONS };

export function Icon({
  name,
  size = 'md',
  className = '',
  ...props
}: {
  name: IconName | string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
} & React.SVGAttributes<SVGSVGElement>) {
  const Component = ALL_ICONS[name as IconName] ?? Target;
  return (
    <Component
      className={`${SIZE_CLASS[size]} ${className}`}
      strokeWidth={2}
      aria-hidden
      {...props}
    />
  );
}

export { WEATHER_ICONS, QUEST_ICONS, UI_ICONS };
