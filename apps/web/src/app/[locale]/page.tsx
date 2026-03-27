import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { QuestiaLogo } from '@/components/QuestiaLogo';
import { QuestExamplesSlider, type ExampleQuestSlide } from '@/components/QuestExamplesSlider';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { LandingJsonLd } from '@/components/LandingJsonLd';
import { LandingReveal } from '@/components/LandingReveal';
import { hasAnyStoreLink } from '@/config/marketing';
import { siteUrl } from '@/config/marketing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'HomeMetadata' });
  const keywords = t.raw('keywords') as string[];
  const desc = t('description');
  return {
    title: t('title'),
    description: desc,
    keywords,
    alternates: { canonical: locale === 'en' ? '/en' : '/' },
    openGraph: {
      title: t('ogTitle'),
      description: desc,
      url: siteUrl,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      siteName: 'Questia',
      images: [{ url: '/brand/questia-logo.png', width: 512, height: 512, alt: 'Questia' }],
    },
    twitter: {
      card: 'summary',
      title: t('twitterTitle'),
      description: desc,
      images: ['/brand/questia-logo.png'],
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('HomePage');
  const storesReady = hasAnyStoreLink();
  const STEPS = t.raw('steps') as { emoji: string; title: string; desc: string }[];
  const EXAMPLE_QUESTS = t.raw('examples') as ExampleQuestSlide[];
  const testimonialQuotes = t.raw('testimonialQuotes') as { quote: string; name: string; age: number }[];
  const LANDING_FAQ = t.raw('faqItems') as { question: string; answer: string }[];

  return (
    <div className="min-h-screen bg-adventure relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-24 left-1/2 w-[min(112rem,220%)] max-w-none -translate-x-1/2 h-[min(42vh,28rem)] rounded-[100%] bg-gradient-to-b from-cyan-200/30 via-orange-100/8 to-transparent blur-3xl motion-safe:animate-glow-soft opacity-[0.65] motion-reduce:animate-none motion-reduce:opacity-40" />
      </div>

      <div className="relative z-10">
        <LandingJsonLd locale={locale} />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
        <section
          id="hero"
          className="relative min-h-[100dvh] flex flex-col justify-center pt-[max(7.25rem,calc(env(safe-area-inset-top,0px)+5.75rem))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:py-14 md:py-16 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:px-5 md:px-6 lg:px-8 xl:px-10 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute top-16 sm:top-24 left-[4%] sm:left-[8%] text-4xl sm:text-6xl opacity-20 sm:opacity-25 select-none motion-safe:animate-float motion-reduce:animate-none">
              🧭
            </div>
            <div className="absolute top-20 sm:top-28 right-[6%] sm:right-[10%] text-3xl sm:text-5xl opacity-20 sm:opacity-25 select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:2s]">
              🎒
            </div>
            <div className="absolute bottom-16 sm:bottom-20 left-[40%] sm:left-[45%] text-3xl sm:text-5xl opacity-20 sm:opacity-25 select-none motion-safe:animate-float-delayed motion-reduce:animate-none">
              🎲
            </div>
          </div>

          <div className="relative w-full max-w-[min(100%,88rem)] mx-auto">
            <div className="landing-hero-panel p-4 sm:p-6 md:p-8 lg:p-10 xl:p-11 2xl:p-12 motion-safe:animate-fade-up motion-reduce:opacity-100">
              <div className="relative z-[1] grid grid-cols-1 lg:grid-cols-[minmax(0,1.06fr)_minmax(280px,min(520px,42vw))] xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,540px)] 2xl:grid-cols-[minmax(0,1.14fr)_minmax(320px,560px)] gap-7 sm:gap-9 md:gap-10 lg:gap-12 xl:gap-14 2xl:gap-16 lg:items-center">
            <div className="space-y-5 sm:space-y-7 md:space-y-8 min-w-0">
              <h1
                id="hero-heading"
                className="font-display font-black text-[clamp(1.5rem,3.2vw+0.85rem,2.75rem)] sm:text-[clamp(1.85rem,2.2vw+1.1rem,2.5rem)] md:text-5xl lg:text-[clamp(2.5rem,2vw+1.75rem,3.5rem)] xl:text-[3.5rem] leading-[1.08] sm:leading-[1.1] text-[var(--on-cream)] mb-1 sm:mb-2 motion-safe:animate-fade-up motion-reduce:opacity-100 [overflow-wrap:anywhere] text-balance"
              >
              {t('hero.line1')}{' '}
              <span className="text-gradient-pop text-[1.06em] md:text-[1.1em] lg:text-[1.12em] tracking-[-0.02em]">
                {t('hero.gradient')}
              </span>
              <br />
              {t('hero.line2')} <span aria-hidden>🗺️</span>
            </h1>

            <div className="space-y-4 max-w-xl lg:max-w-2xl xl:max-w-[44rem] motion-safe:animate-fade-up motion-safe:delay-100 motion-reduce:opacity-100">
              <p className="text-[0.9375rem] sm:text-lg md:text-xl font-medium text-[var(--on-cream-muted)] leading-[1.55] sm:leading-relaxed">
                {t.rich('hero.lead', {
                  strong: (chunks) => <strong className="text-[var(--on-cream)]">{chunks}</strong>,
                })}
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-2 motion-safe:animate-fade-up motion-safe:delay-200 motion-reduce:opacity-100">
              {storesReady ? (
                <>
                  <AppStoreButtons className="w-full sm:justify-start" />
                  <div className="flex flex-col gap-2 pt-1 border-t border-orange-200/45">
                    <p className="text-xs text-[var(--on-cream-subtle)]">
                      {t('hero.preferWeb')}{' '}
                      <Link href="/onboarding" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
                        {t('hero.continueBrowser')}
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--on-cream-muted)] leading-snug">
                      {t('hero.webOnly')}
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className="btn btn-cta btn-lg text-base w-full sm:w-auto text-center font-black"
                  >
                    {t('hero.ctaFree')}
                  </Link>
                  <a
                    href="#hero-examples"
                    className="btn btn-ghost btn-lg w-full sm:w-auto text-center font-black"
                  >
                    {t('hero.seeExamples')}
                  </a>
                  <div className="rounded-2xl border-2 border-dashed border-orange-300/60 bg-gradient-to-br from-amber-50/80 to-cyan-50/50 px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-900 mb-2 text-center">
                      {t('hero.soonStores')}
                    </p>
                    <AppStoreButtons variant="compact" />
                  </div>
                </>
              )}
            </div>
          </div>

          <aside
            id="hero-examples"
            className="flex w-full max-w-lg mx-auto justify-center items-stretch lg:max-w-none lg:mx-0 lg:justify-end scroll-mt-[5.5rem] sm:scroll-mt-28 motion-safe:animate-fade-up motion-safe:delay-300 motion-reduce:opacity-100 min-w-0 pt-1 lg:pt-0"
            aria-label={t('hero.examplesAsideLabel')}
          >
            <div className="w-full min-w-0 max-w-[min(100%,28rem)] sm:max-w-[min(100%,30rem)] xl:max-w-[min(100%,34rem)] 2xl:max-w-[min(100%,36rem)]">
              <QuestExamplesSlider quests={EXAMPLE_QUESTS} variant="embedded" nestedInPanel />
            </div>
          </aside>
              </div>
            </div>
        </div>
      </section>

      <section id="how" className="section-band-how min-h-[100dvh] flex flex-col justify-center py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 sm:px-6 scroll-mt-20 sm:scroll-mt-24" aria-labelledby="how-heading">
        <LandingReveal>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 md:mb-20 space-y-4 sm:space-y-5">
            <p className="label flex items-center justify-center gap-2 text-emerald-900">
              <span aria-hidden>⚡</span> {t('how.label')}
            </p>
            <h2 id="how-heading" className="font-display font-black text-2xl sm:text-3xl md:text-5xl text-slate-900 leading-tight [overflow-wrap:anywhere] px-1">
              {t('how.title')}
            </h2>
            <p className="text-slate-600 text-base sm:text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed px-1">
              {t('how.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`card card-hover rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-9 flex flex-col items-start gap-4 sm:gap-5 border-2 border-slate-900/10 shadow-[0_6px_0_rgba(15,23,42,.06)] ${
                  i === 1 ? 'md:-rotate-1' : i === 2 ? 'md:rotate-1' : ''
                }`}
              >
                <span className="text-5xl leading-none" aria-hidden>
                  {s.emoji}
                </span>
                <div className="space-y-3">
                  <p className="text-xs font-black text-orange-800 uppercase tracking-wider">
                    {t('how.stepLabel')} {i + 1}
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
        className="min-h-[100dvh] flex flex-col justify-center py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 sm:px-6 scroll-mt-20 sm:scroll-mt-24 border-y-2 border-cyan-300/25 bg-gradient-to-b from-white/40 to-cyan-50/30"
        aria-labelledby="download-heading"
      >
        <LandingReveal delayMs={40}>
        <div className="max-w-3xl mx-auto text-center space-y-5 sm:space-y-6 px-1">
          <p className="label flex items-center justify-center gap-2 text-cyan-900">
            <span aria-hidden>📲</span> {t('download.label')}
          </p>
          <h2 id="download-heading" className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-tight [overflow-wrap:anywhere]">
            {t('download.title')}
          </h2>
          <p className="text-slate-600 text-base sm:text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            {t('download.subtitle')}
          </p>
          <div className="pt-4 flex flex-col items-center gap-4">
            <AppStoreButtons className="justify-center" />
            <p className="text-sm text-slate-500 max-w-md">
              <Link href="/onboarding" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
                {t('download.webLink')}
              </Link>
            </p>
          </div>
        </div>
        </LandingReveal>
      </section>

      <section id="testimonials" className="section-band-social min-h-[100dvh] flex flex-col justify-center py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 sm:px-6 relative scroll-mt-20 sm:scroll-mt-24" aria-labelledby="testimonials-heading">
        <LandingReveal delayMs={40}>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4 px-1">
            <p className="label flex items-center justify-center gap-2 text-orange-900">
              <span aria-hidden>💬</span> {t('testimonials.label')}
            </p>
            <h2 id="testimonials-heading" className="font-display font-black text-2xl sm:text-3xl md:text-5xl text-slate-900 leading-tight [overflow-wrap:anywhere]">
              {t('testimonials.title')}
            </h2>
            <p className="text-slate-600 text-base sm:text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
            {testimonialQuotes.map((row, i) => (
              <article
                key={row.name}
                className="rounded-2xl sm:rounded-3xl p-6 sm:p-7 md:p-8 border-[3px] bg-white/90 backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                style={{
                  borderColor: i === 0 ? 'rgba(249,115,22,.45)' : i === 1 ? 'rgba(34,211,238,.5)' : 'rgba(16,185,129,.45)',
                  boxShadow: i === 0 ? '0 10px 0 rgba(234,88,12,.12), 0 20px 40px rgba(249,115,22,.12)' : i === 1 ? '0 10px 0 rgba(8,145,178,.1), 0 20px 40px rgba(34,211,238,.12)' : '0 10px 0 rgba(5,150,105,.1), 0 20px 40px rgba(16,185,129,.12)',
                }}
              >
                <blockquote className="text-slate-900 text-[15px] sm:text-base leading-relaxed font-semibold mb-5 sm:mb-6 [overflow-wrap:anywhere]">
                  « {row.quote} »
                </blockquote>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{row.name}</span>
                  {', '}
                  {row.age} {t('testimonials.yearsOld')}
                </p>
              </article>
            ))}
          </div>
        </div>
        </LandingReveal>
      </section>

      <section id="faq" className="min-h-[100dvh] py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 sm:px-6 scroll-mt-20 sm:scroll-mt-24 bg-white/30" aria-labelledby="faq-heading">
        <LandingReveal delayMs={40}>
        <div className="max-w-2xl mx-auto min-w-0">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 space-y-2 sm:space-y-3 px-1">
            <p className="label text-emerald-900">{t('faq.label')}</p>
            <h2 id="faq-heading" className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-tight [overflow-wrap:anywhere]">
              {t('faq.title')}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium max-w-lg mx-auto leading-relaxed">
              {t('faq.subtitle')}
            </p>
          </div>
          <div
            className="rounded-2xl sm:rounded-3xl border-2 border-slate-900/[0.08] bg-white/95 shadow-[0_1px_0_rgba(15,23,42,.06),0_12px_40px_-12px_rgba(15,23,42,.12)] overflow-hidden divide-y divide-slate-200/80"
          >
            {LANDING_FAQ.map((item) => (
              <details key={item.question} className="group">
                <summary className="cursor-pointer list-none min-h-[3rem] sm:min-h-0 px-4 sm:px-6 py-4 sm:py-5 font-bold text-slate-900 flex items-start justify-between gap-3 sm:gap-4 text-left select-none touch-manipulation [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-slate-50/80">
                  <span className="leading-snug text-[14px] sm:text-[15px] md:text-base pt-0.5 [overflow-wrap:anywhere]">{item.question}</span>
                  <span
                    className="shrink-0 mt-0.5 inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-open:bg-cyan-50 group-open:text-cyan-800 transition-colors"
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
                <div className="px-4 sm:px-6 pb-4 sm:pb-5 -mt-1">
                  <p className="text-slate-600 text-sm md:text-[15px] leading-relaxed border-l-2 border-cyan-200/90 pl-3 sm:pl-4 [overflow-wrap:anywhere]">
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
        className="section-band-cta min-h-[100dvh] flex flex-col justify-center py-12 sm:py-16 md:py-20 lg:py-24 px-3 sm:px-4 sm:px-6 scroll-mt-20 sm:scroll-mt-24 border-t-2 border-orange-200/40"
        aria-labelledby="cta-heading"
      >
        <LandingReveal delayMs={40}>
          <div className="max-w-4xl mx-auto min-w-0">
            <div className="landing-cta-panel px-4 py-8 sm:px-10 sm:py-11 md:px-12 md:py-12 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none">
              <div className="text-center space-y-2">
                <p className="label text-orange-900">{t('cta.label')}</p>
                <h2
                  id="cta-heading"
                  className="font-display font-black text-[clamp(1.25rem,3.5vw+0.6rem,1.85rem)] sm:text-3xl md:text-[2.15rem] text-slate-900 leading-tight tracking-tight [overflow-wrap:anywhere] px-0.5"
                >
                  {t('cta.titleBefore')}{' '}
                  <span className="text-gradient-pop text-[1.08em] sm:text-[1.12em] md:text-[1.18em] tracking-[-0.03em]">
                    {t('cta.titleGradient')}
                  </span>{' '}
                  {t('cta.titleAfter')}
                </h2>
                <p className="text-slate-700 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto pt-1 px-0.5">
                  {storesReady ? t('cta.storesReady') : t('cta.storesPending')}
                </p>
              </div>

              {storesReady ? (
                <div className="mt-8 md:mt-9 flex flex-col items-stretch gap-6 sm:gap-7">
                  <AppStoreButtons className="justify-center w-full" />
                  <div className="flex items-center gap-3 w-full max-w-md mx-auto">
                    <div className="flex-1 h-px divider-glow opacity-80" aria-hidden />
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-800/80 shrink-0">
                      {t('cta.or')}
                    </span>
                    <div className="flex-1 h-px divider-glow opacity-80" aria-hidden />
                  </div>
                  <div className="flex justify-center">
                    <Link
                      href="/onboarding"
                      className="group inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-white/65 px-4 py-2.5 text-sm font-semibold text-cyan-950 transition-colors hover:border-cyan-500/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    >
                      Continuer sur le web
                      <ArrowRight
                        className="h-4 w-4 text-cyan-700/70 transition-transform group-hover:translate-x-px motion-reduce:transition-none"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 md:mt-9 flex flex-col items-center gap-5 text-center">
                  <Link href="/onboarding" className="btn btn-cta btn-lg text-base font-black w-full max-w-sm justify-center">
                    {t('cta.ctaFree')}
                  </Link>
                  <a
                    href="#telecharger"
                    className="text-sm font-bold text-cyan-900/90 underline-offset-2 hover:underline decoration-orange-300/80"
                  >
                    {t('cta.appStoresLink')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </LandingReveal>
      </section>
        </main>

      <footer className="border-t border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 sm:px-6 py-10 sm:py-12 md:py-14">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 sm:gap-10 md:gap-12">
            <div className="max-w-sm">
              <div className="flex items-center gap-3">
                <QuestiaLogo variant="footer" />
                <p className="font-display font-black text-lg tracking-tight text-slate-900">Questia</p>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {t('footer.tagline')}
              </p>
            </div>
            <nav
              className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row md:flex-wrap gap-x-4 gap-y-2.5 md:gap-x-6 md:gap-y-3 text-sm font-semibold text-slate-600 min-w-0"
              aria-label={t('footer.navLabel')}
            >
              <a href="#hero-examples" className="hover:text-slate-900 transition-colors">
                {t('footer.examples')}
              </a>
              <a href="#how" className="hover:text-slate-900 transition-colors">
                {t('footer.how')}
              </a>
              <a href="#telecharger" className="hover:text-slate-900 transition-colors">
                {t('footer.download')}
              </a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">
                {t('footer.faq')}
              </a>
              <Link href="/sign-in" className="hover:text-slate-900 transition-colors">
                {t('footer.signIn')}
              </Link>
              <Link href="/legal/confidentialite" className="hover:text-slate-900 transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link href="/legal/mentions-legales" className="hover:text-slate-900 transition-colors">
                {t('footer.legal')}
              </Link>
              <Link href="/legal/cgu" className="hover:text-slate-900 transition-colors">
                {t('footer.terms')}
              </Link>
              <Link href="/legal/cgv" className="hover:text-slate-900 transition-colors">
                {t('footer.sales')}
              </Link>
              <Link href="/legal/bien-etre" className="hover:text-slate-900 transition-colors">
                {t('footer.wellbeing')}
              </Link>
            </nav>
          </div>
          <p className="mt-10 pt-8 border-t border-slate-200/80 text-center text-xs text-slate-500">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
