import { appStoreUrl, hasAppStoreLink, hasPlayStoreLink, playStoreUrl } from '@/config/marketing';

/**
 * Assets marketing officiels (Apple App Store + Google Play).
 * @see https://developer.apple.com/app-store/marketing/guidelines/
 * @see https://play.google.com/intl/en_us/badges/
 */
const APP_STORE_BADGE_FR =
  'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/fr-fr?size=250x83';
const GOOGLE_PLAY_BADGE_FR =
  'https://play.google.com/intl/en_us/badges/static/images/badges/fr_badge_web_generic.png';

type Props = {
  variant?: 'default' | 'compact';
  className?: string;
};

export function AppStoreButtons({ variant = 'default', className = '' }: Props) {
  const ios = hasAppStoreLink();
  const android = hasPlayStoreLink();

  /** Hauteur d’affichage : le PNG Google inclut beaucoup de marge autour du logo — un peu plus haut pour équilibrer avec Apple. */
  const hApple = variant === 'compact' ? 'h-9 sm:h-10' : 'h-12';
  const hGoogle = variant === 'compact' ? 'h-10 sm:h-11' : 'h-16';

  /** Lien serré autour de l’image (pas de cadre fixe → plus de « trou » transparent). Ombre portée sur l’image uniquement. */
  const linkClass =
    'group inline-flex shrink-0 items-center justify-center p-0 leading-none outline-none ' +
    'transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md';

  const imgShadow =
    '[filter:drop-shadow(0_2px_6px_rgba(0,0,0,.2))] hover:[filter:drop-shadow(0_3px_8px_rgba(0,0,0,.25))]';

  return (
    <div
      className={`flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 ${className}`}
      role="group"
      aria-label="Télécharger l'application Dopamode"
    >
      {ios ? (
        <a
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} focus-visible:ring-cyan-600`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- badges officiels Apple */}
          <img
            src={APP_STORE_BADGE_FR}
            alt="Télécharger dans l’App Store"
            width={250}
            height={83}
            className={`block w-auto max-w-[min(100vw-2rem,280px)] ${hApple} ${imgShadow}`}
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : null}

      {android ? (
        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} focus-visible:ring-emerald-600`}
        >
          {/*
            PNG Google = logo + marges intégrées ; hauteur légèrement supérieure à Apple pour un rendu visuel équivalent.
            mix-blend-multiply : fusionne le blanc du fichier avec le fond de la page.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element -- badge officiel Google Play */}
          <img
            src={GOOGLE_PLAY_BADGE_FR}
            alt="Disponible sur Google Play"
            width={646}
            height={250}
            className={`block w-auto max-w-[min(100vw-2rem,300px)] ${hGoogle} ${imgShadow} mix-blend-multiply`}
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : null}

      {!ios && !android && (
        <p className="text-sm font-bold text-slate-700 text-center sm:text-left px-2 max-w-md leading-relaxed">
          L’app mobile arrive sur l’App Store et Google Play. En attendant, commence sur le web — même
          parcours, mêmes quêtes.
        </p>
      )}
    </div>
  );
}
