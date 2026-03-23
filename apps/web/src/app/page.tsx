import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { QuestExamplesSlider, type ExampleQuestSlide } from '@/components/QuestExamplesSlider';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { LandingJsonLd } from '@/components/LandingJsonLd';
import { LandingReveal } from '@/components/LandingReveal';
import { hasAnyStoreLink } from '@/config/marketing';
import { siteUrl } from '@/config/marketing';
import { LANDING_FAQ } from '@/data/landing-seo';

const seoDescription =
  'Dopamode : application de quêtes quotidiennes dans la vraie vie. Motivation, défis IRL et petites victoires adaptés à ton profil et à ton rythme. Gratuit pour commencer — iOS, Android et web.';

export const metadata: Metadata = {
  title: 'Dopamode — App de quêtes quotidiennes IRL (iOS, Android & Web)',
  description: seoDescription,
  keywords: [
    'Dopamode',
    'application quête quotidienne',
    'motivation quotidienne',
    'défis vie réelle',
    'gamification',
    'sortir de sa zone de confort',
    'routine ludique',
    'app bien-être',
    'quête IRL',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Dopamode — App de quêtes quotidiennes dans la vraie vie',
    description: seoDescription,
    url: siteUrl,
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Dopamode',
  },
  twitter: {
    card: 'summary',
    title: 'Dopamode — App de quêtes quotidiennes IRL',
    description: seoDescription,
  },
};

const STEPS = [
  {
    emoji: '🎯',
    title: 'Toi, d’abord',
    desc: 'Tu indiques ton style et ce que tu es prêt à tenter — les missions s’alignent sur ton profil et ton énergie du moment.',
  },
  {
    emoji: '🧠',
    title: 'Profil en 2 questions',
    desc: 'Deux réponses pour calibrer le défi — ni trop facile, ni injouable.',
  },
  {
    emoji: '⚔️',
    title: 'Ta quête du matin',
    desc: 'Une mission courte, avec une fin claire. Tu coches, tu passes à autre chose.',
  },
];

const EXAMPLE_QUESTS: ExampleQuestSlide[] = [
  {
    emoji: '📸',
    title: "L'Explorateur Urbain",
    contextLabel: 'Curiosité · après-midi',
    mission:
      'Passe 1h dans un quartier que tu traverses sans jamais t’y arrêter. Photographie 5 choses qui t’étonnent.',
    duration: '1h30',
    outdoor: true,
  },
  {
    emoji: '☕',
    title: 'Le Café des Étrangers',
    contextLabel: 'Pause sociale · 45 min',
    mission:
      'Va dans un café que tu ne connais pas. Commande quelque chose que tu ne prends jamais. 45 min sans téléphone — mode boss fight.',
    duration: '1h',
    outdoor: false,
  },
  {
    emoji: '📞',
    title: 'Ta Voix, une Fois',
    contextLabel: 'Reconnexion · court',
    mission:
      'Appelle quelqu’un à qui tu penses depuis longtemps. Dis-lui que tu pensais à lui. Quête bonus : écoute vraiment.',
    duration: '30 min',
    outdoor: false,
  },
];

const TESTIMONIALS: {
  quote: string;
  name: string;
  age: number;
}[] = [
  {
    quote:
      "Jour 23. Je pensais être une fille sociable. J'ai réalisé que non. Maintenant je le suis vraiment.",
    name: 'Sarah',
    age: 29,
  },
  {
    quote:
      "En 3 semaines j'ai découvert 8 restos, 3 musées et un nouvel ami — dans des lieux que je passais sans les voir.",
    name: 'Marc',
    age: 34,
  },
  {
    quote:
      "Je pensais que j'aimais rester chez moi. J'aimais juste avoir peur de sortir. Grosse différence.",
    name: 'Camille',
    age: 26,
  },
];

export default function HomePage() {
  const storesReady = hasAnyStoreLink();

  return (
    <div className="min-h-screen bg-adventure relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-24 left-1/2 w-[min(112rem,220%)] max-w-none -translate-x-1/2 h-[min(42vh,28rem)] rounded-[100%] bg-gradient-to-b from-cyan-200/30 via-orange-100/8 to-transparent blur-3xl motion-safe:animate-glow-soft opacity-[0.65] motion-reduce:animate-none motion-reduce:opacity-40" />
      </div>

      <div className="relative z-10">
        <LandingJsonLd />
        <Navbar />
        <section
          id="hero"
          className="relative pt-36 md:pt-44 pb-28 md:pb-36 px-4 sm:px-6 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute top-24 left-[8%] text-6xl opacity-25 select-none motion-safe:animate-float motion-reduce:animate-none">
              🧭
            </div>
            <div className="absolute top-28 right-[10%] text-5xl opacity-25 select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:2s]">
              🎒
            </div>
            <div className="absolute bottom-20 left-[45%] text-5xl opacity-25 select-none motion-safe:animate-float-delayed motion-reduce:animate-none">
              🎲
            </div>
          </div>

          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,440px)] xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,480px)] gap-12 lg:gap-14 xl:gap-16 lg:items-center">
            <div className="space-y-8">
              <h1
                id="hero-heading"
                className="font-display font-black text-4xl md:text-5xl lg:text-[3.35rem] leading-[1.12] text-slate-900 mb-2 motion-safe:animate-fade-up motion-reduce:opacity-100"
              >
              L'app de{' '}
              <span className="text-gradient-pop text-[1.06em] md:text-[1.1em] lg:text-[1.12em] tracking-[-0.02em]">
                quêtes quotidiennes
              </span>
              <br />
              dans la vraie vie <span aria-hidden>🗺️</span>
            </h1>

            <div className="space-y-4 max-w-xl motion-safe:animate-fade-up motion-safe:delay-100 motion-reduce:opacity-100">
              <p className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed">
                Une mission chaque matin, <strong className="text-slate-900">ajustée à ton profil</strong> et à ton
                rythme — pour sortir un peu plus, sans te mettre la pression.
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-2 motion-safe:animate-fade-up motion-safe:delay-200 motion-reduce:opacity-100">
              {storesReady ? (
                <>
                  <AppStoreButtons className="w-full sm:justify-start" />
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/80">
                    <p className="text-xs text-slate-500">
                      Tu préfères le web ?{' '}
                      <Link href="/onboarding" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
                        Continuer dans le navigateur
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 leading-snug">
                      Commence sur le web — quand l’app sort, tu te connectes avec le même compte.
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className="btn btn-cta btn-lg text-base w-full sm:w-auto text-center font-black"
                  >
                    Commencer gratuitement
                  </Link>
                  <a
                    href="#hero-examples"
                    className="btn btn-ghost btn-lg w-full sm:w-auto text-center font-black"
                  >
                    Voir des exemples de missions
                  </a>
                  <div className="rounded-2xl border-2 border-dashed border-orange-300/60 bg-gradient-to-br from-amber-50/80 to-cyan-50/50 px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-900 mb-2 text-center">
                      Bientôt sur iPhone &amp; Android
                    </p>
                    <AppStoreButtons variant="compact" />
                  </div>
                </>
              )}
            </div>
          </div>

          <aside
            id="hero-examples"
            className="flex w-full max-w-md mx-auto justify-center items-center self-stretch lg:max-w-none lg:mx-0 scroll-mt-28 motion-safe:animate-fade-up motion-safe:delay-300 motion-reduce:opacity-100"
            aria-label="Missions en carrousel"
          >
            <div className="w-full max-w-[27rem] xl:max-w-[30rem]">
              <QuestExamplesSlider quests={EXAMPLE_QUESTS} variant="embedded" />
            </div>
          </aside>
        </div>
      </section>

      <section id="how" className="section-band-how py-28 md:py-36 px-4 sm:px-6 scroll-mt-24" aria-labelledby="how-heading">
        <LandingReveal>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 md:mb-20 space-y-5">
            <p className="label flex items-center justify-center gap-2 text-emerald-900">
              <span aria-hidden>⚡</span> Fonctionnement
            </p>
            <h2 id="how-heading" className="font-display font-black text-3xl md:text-5xl text-slate-900 leading-tight">
              Trois étapes, puis ta quête du matin
            </h2>
            <p className="text-slate-600 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Tu te calibres en une minute, puis chaque matin tu reçois ta mission. Sur l’app : rappels et tout dans la
              poche ; sur le web, même expérience depuis un navigateur.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="card card-hover rounded-3xl p-8 md:p-9 flex flex-col items-start gap-5 border-2 border-slate-900/10 shadow-[0_6px_0_rgba(15,23,42,.06)]"
                style={{ transform: i === 1 ? 'rotate(-1deg)' : i === 2 ? 'rotate(1deg)' : 'none' }}
              >
                <span className="text-5xl leading-none" aria-hidden>
                  {s.emoji}
                </span>
                <div className="space-y-3">
                  <p className="text-xs font-black text-orange-800 uppercase tracking-wider">
                    Étape {i + 1}
                  </p>
                  <h3 className="font-display font-bold text-slate-900 text-xl leading-snug">{s.title}</h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </LandingReveal>
      </section>

      <section
        id="telecharger"
        className="py-28 md:py-36 px-4 sm:px-6 scroll-mt-24 border-y-2 border-cyan-300/25 bg-gradient-to-b from-white/40 to-cyan-50/30"
        aria-labelledby="download-heading"
      >
        <LandingReveal delayMs={40}>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="label flex items-center justify-center gap-2 text-cyan-900">
            <span aria-hidden>📲</span> Télécharger
          </p>
          <h2 id="download-heading" className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-tight">
            iPhone &amp; Android
          </h2>
          <p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            Quête du jour, rappels et progression sur ton téléphone. Tu peux aussi tout faire depuis le web avec le
            même compte.
          </p>
          <div className="pt-4 flex flex-col items-center gap-4">
            <AppStoreButtons className="justify-center" />
            <p className="text-sm text-slate-500 max-w-md">
              <Link href="/onboarding" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
                Utiliser Dopamode sur le web
              </Link>
            </p>
          </div>
        </div>
        </LandingReveal>
      </section>

      <section id="testimonials" className="section-band-social py-28 md:py-36 px-4 sm:px-6 relative scroll-mt-24" aria-labelledby="testimonials-heading">
        <LandingReveal delayMs={40}>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-14 md:mb-16 space-y-4">
            <p className="label flex items-center justify-center gap-2 text-orange-900">
              <span aria-hidden>💬</span> Avis &amp; résultats
            </p>
            <h2 id="testimonials-heading" className="font-display font-black text-3xl md:text-5xl text-slate-900 leading-tight">
              Des joueurs qui avaient la flemme aussi
            </h2>
            <p className="text-slate-600 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Pas de miracle, juste des petits pas — quand le jeu remplace la culpabilité.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {TESTIMONIALS.map((t, i) => (
              <article
                key={t.name}
                className="rounded-3xl p-7 md:p-8 border-[3px] bg-white/90 backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                style={{
                  borderColor: i === 0 ? 'rgba(249,115,22,.45)' : i === 1 ? 'rgba(34,211,238,.5)' : 'rgba(16,185,129,.45)',
                  boxShadow: i === 0 ? '0 10px 0 rgba(234,88,12,.12), 0 20px 40px rgba(249,115,22,.12)' : i === 1 ? '0 10px 0 rgba(8,145,178,.1), 0 20px 40px rgba(34,211,238,.12)' : '0 10px 0 rgba(5,150,105,.1), 0 20px 40px rgba(16,185,129,.12)',
                }}
              >
                <blockquote className="text-slate-900 text-base leading-relaxed font-semibold mb-6">
                  « {t.quote} »
                </blockquote>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{t.name}</span>
                  {', '}
                  {t.age} ans
                </p>
              </article>
            ))}
          </div>
        </div>
        </LandingReveal>
      </section>

      <section id="faq" className="py-28 md:py-36 px-4 sm:px-6 scroll-mt-24 bg-white/30" aria-labelledby="faq-heading">
        <LandingReveal delayMs={40}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 md:mb-12 space-y-3">
            <p className="label text-emerald-900">FAQ</p>
            <h2 id="faq-heading" className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-tight">
              Questions fréquentes
            </h2>
            <p className="text-slate-600 text-base md:text-lg font-medium max-w-lg mx-auto leading-relaxed">
              Tout ce qu’il faut savoir avant de te lancer — web ou mobile.
            </p>
          </div>
          <div
            className="rounded-3xl border-2 border-slate-900/[0.08] bg-white/95 shadow-[0_1px_0_rgba(15,23,42,.06),0_12px_40px_-12px_rgba(15,23,42,.12)] overflow-hidden divide-y divide-slate-200/80"
          >
            {LANDING_FAQ.map((item) => (
              <details key={item.question} className="group">
                <summary className="cursor-pointer list-none px-5 sm:px-6 py-4 sm:py-5 font-bold text-slate-900 flex items-start justify-between gap-4 text-left select-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                  <span className="leading-snug text-[15px] sm:text-base pt-0.5">{item.question}</span>
                  <span
                    className="shrink-0 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-open:bg-cyan-50 group-open:text-cyan-800 transition-colors"
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.25}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 sm:px-6 pb-5 -mt-1">
                  <p className="text-slate-600 text-sm md:text-[15px] leading-relaxed border-l-2 border-cyan-200/90 pl-4">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
        </LandingReveal>
      </section>

      <section
        id="cta"
        className="section-band-cta py-24 md:py-32 px-4 sm:px-6 scroll-mt-24 border-t-2 border-orange-200/40"
        aria-labelledby="cta-heading"
      >
        <LandingReveal delayMs={40}>
          <div className="max-w-4xl mx-auto">
            <div className="landing-cta-panel px-6 py-9 sm:px-10 sm:py-11 md:px-12 md:py-12 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none">
              <div className="text-center space-y-2">
                <p className="label text-orange-900">C’est parti</p>
                <h2
                  id="cta-heading"
                  className="font-display font-black text-2xl sm:text-3xl md:text-[2.15rem] text-slate-900 leading-tight tracking-tight"
                >
                  Prêt pour ta prochaine{' '}
                  <span className="text-gradient-pop text-[1.08em] sm:text-[1.12em] md:text-[1.18em] tracking-[-0.03em]">
                    quête IRL
                  </span>{' '}
                  ?
                </h2>
                <p className="text-slate-700 text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto pt-1">
                  {storesReady
                    ? 'Gratuit pour commencer — sur les stores ou dans ton navigateur, avec le même compte.'
                    : 'Crée ton profil sur le web ; quand l’app sera dispo, tu reprends avec le même compte.'}
                </p>
              </div>

              {storesReady ? (
                <div className="mt-8 md:mt-9 flex flex-col items-stretch gap-6 sm:gap-7">
                  <AppStoreButtons className="justify-center w-full" />
                  <div className="flex items-center gap-3 w-full max-w-md mx-auto">
                    <div className="flex-1 h-px divider-glow opacity-80" aria-hidden />
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-800/80 shrink-0">
                      ou
                    </span>
                    <div className="flex-1 h-px divider-glow opacity-80" aria-hidden />
                  </div>
                  <div className="flex justify-center">
                    <Link
                      href="/onboarding"
                      className="btn btn-ghost btn-lg text-base w-full sm:w-auto min-w-[min(100%,16rem)] font-bold border-2 border-white/80 bg-white/55 backdrop-blur-sm shadow-sm hover:border-cyan-300/50 hover:bg-white/90"
                    >
                      Continuer sur le web
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 md:mt-9 flex flex-col items-center gap-5 text-center">
                  <Link href="/onboarding" className="btn btn-cta btn-lg text-base font-black w-full max-w-sm justify-center">
                    Commencer gratuitement
                  </Link>
                  <a
                    href="#telecharger"
                    className="text-sm font-bold text-cyan-900/90 underline-offset-2 hover:underline decoration-orange-300/80"
                  >
                    L’app sur iPhone et Android
                  </a>
                </div>
              )}
            </div>
          </div>
        </LandingReveal>
      </section>

      <footer className="border-t border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-14">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-12">
            <div className="max-w-sm">
              <p className="font-display font-black text-lg tracking-tight text-slate-900">Dopamode</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Des quêtes courtes dans la vraie vie — une mission par jour, sans te mettre la pression.
              </p>
            </div>
            <nav
              className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600"
              aria-label="Liens de pied de page"
            >
              <a href="#hero-examples" className="hover:text-slate-900 transition-colors">
                Exemples
              </a>
              <a href="#how" className="hover:text-slate-900 transition-colors">
                Comment ça marche
              </a>
              <a href="#telecharger" className="hover:text-slate-900 transition-colors">
                Télécharger
              </a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">
                FAQ
              </a>
              <Link href="/sign-in" className="hover:text-slate-900 transition-colors">
                Connexion
              </Link>
            </nav>
          </div>
          <p className="mt-10 pt-8 border-t border-slate-200/80 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Dopamode
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
