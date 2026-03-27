import Image from 'next/image';

const LOGO_SRC = '/brand/questia-logo.png';

/** Dimensions intrinsèques du PNG (carré) — utilisées pour next/image sans `fill` (évite le rognage avec padding sur l’img). */
const LOGO_PX = 512;

export type QuestiaLogoVariant = 'navbar' | 'auth' | 'footer' | 'onboarding' | 'card' | 'shareHero';

const VARIANT: Record<
  QuestiaLogoVariant,
  { box: string; sizes: string; inset: string; img: string }
> = {
  navbar: {
    box: 'h-9 w-9 min-h-9 min-w-9 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10 overflow-visible',
    sizes: '(max-width: 640px) 36px, 40px',
    inset: 'inset-[6%]',
    img: 'drop-shadow-[0_1px_4px_rgba(15,23,42,0.4)]',
  },
  auth: {
    box: 'h-10 w-10 min-h-10 min-w-10 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11 rounded-xl overflow-hidden',
    sizes: '44px',
    inset: 'inset-[10%]',
    img: 'drop-shadow-[0_1px_4px_rgba(15,23,42,0.35)]',
  },
  footer: {
    box: 'h-10 w-10 min-h-10 min-w-10 rounded-[11px] overflow-hidden',
    sizes: '40px',
    inset: 'inset-[10%]',
    img: 'drop-shadow-[0_1px_3px_rgba(15,23,42,0.3)]',
  },
  onboarding: {
    box: 'h-[4.25rem] w-[4.25rem] min-h-[4.25rem] min-w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem] sm:min-h-[4.75rem] sm:min-w-[4.75rem] rounded-2xl overflow-hidden',
    sizes: '(max-width: 640px) 68px, 76px',
    inset: 'inset-[10%]',
    img: 'drop-shadow-[0_2px_8px_rgba(15,23,42,0.2)]',
  },
  card: {
    box: 'h-[26px] w-[26px] min-h-[26px] min-w-[26px] rounded-[7px] overflow-hidden',
    sizes: '26px',
    inset: 'inset-[8%]',
    img: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]',
  },
  /** Carte de partage sans photo — logo central bien visible. */
  shareHero: {
    box: 'h-[5.75rem] w-[5.75rem] min-h-[5.75rem] min-w-[5.75rem] rounded-[1.15rem] overflow-hidden',
    sizes: '92px',
    inset: 'inset-[8%]',
    img: 'drop-shadow-[0_4px_18px_rgba(15,23,42,0.22)]',
  },
};

type QuestiaLogoProps = {
  variant?: QuestiaLogoVariant;
  className?: string;
  priority?: boolean;
};

/**
 * Logo officiel Questia : PNG carré, fond transparent (voir `scripts/generate-questia-logo-square.mjs`).
 */
export function QuestiaLogo({ variant = 'navbar', className = '', priority = false }: QuestiaLogoProps) {
  const v = VARIANT[variant];
  return (
    <div className={`relative shrink-0 ${v.box} ${className}`}>
      <div className={`absolute ${v.inset}`}>
        <Image
          src={LOGO_SRC}
          alt=""
          width={LOGO_PX}
          height={LOGO_PX}
          className={`h-full w-full object-contain object-center ${v.img}`}
          sizes={v.sizes}
          priority={priority}
        />
      </div>
    </div>
  );
}
