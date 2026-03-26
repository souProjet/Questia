import Image from 'next/image';

const LOGO_SRC = '/brand/questia-logo.png';

export type QuestiaLogoVariant = 'navbar' | 'auth' | 'footer' | 'onboarding' | 'card';

const VARIANT: Record<QuestiaLogoVariant, { box: string; sizes: string; img: string }> = {
  navbar: {
    box: 'h-9 w-9 min-h-9 min-w-9 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10 rounded-[11px]',
    sizes: '(max-width: 640px) 36px, 40px',
    img: 'object-contain p-[8%] drop-shadow-[0_1px_4px_rgba(15,23,42,0.4)]',
  },
  auth: {
    box: 'h-10 w-10 min-h-10 min-w-10 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11 rounded-xl',
    sizes: '44px',
    img: 'object-contain p-[8%] drop-shadow-[0_1px_4px_rgba(15,23,42,0.35)]',
  },
  footer: {
    box: 'h-10 w-10 min-h-10 min-w-10 rounded-[11px]',
    sizes: '40px',
    img: 'object-contain p-[8%] drop-shadow-[0_1px_3px_rgba(15,23,42,0.3)]',
  },
  onboarding: {
    box: 'h-[4.25rem] w-[4.25rem] min-h-[4.25rem] min-w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem] sm:min-h-[4.75rem] sm:min-w-[4.75rem] rounded-2xl',
    sizes: '(max-width: 640px) 68px, 76px',
    img: 'object-contain p-[8%] drop-shadow-[0_2px_8px_rgba(15,23,42,0.2)]',
  },
  card: {
    box: 'h-[26px] w-[26px] min-h-[26px] min-w-[26px] rounded-[7px]',
    sizes: '26px',
    img: 'object-contain p-[6%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]',
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
    <div className={`relative shrink-0 overflow-visible ${v.box} ${className}`}>
      <Image
        src={LOGO_SRC}
        alt=""
        fill
        className={v.img}
        sizes={v.sizes}
        priority={priority}
      />
    </div>
  );
}
