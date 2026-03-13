import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';

// ── Mock quest for hero preview ───────────────────────────────────────────────

const DEMO_QUEST = {
  icon: 'Drama' as const,
  city: 'Lyon',
  weather: 'Ensoleillé, 19°C',
  title: 'Le Dîner du Fantôme',
  mission:
    'Choisis un restaurant que tu as toujours voulu essayer mais que tu n\'as jamais osé pousser seul. Réserve pour ce soir — une place, ton nom. Prends ton temps. Observe.',
  duration: '2h',
  hook: 'Le meilleur voyage, c\'est celui que tu fais seul pour la première fois.',
  phase: 'Semaine de découverte',
};

const STEPS = [
  { icon: 'MapPin' as const, title: 'Ta ville, ta météo', desc: 'Dopamode détecte tes conditions du jour pour des quêtes toujours adaptées.' },
  { icon: 'Brain' as const, title: '2 questions, 30 secondes', desc: 'Ton profil d\'exploration est prêt. Tu n\'as rien de plus à faire.' },
  { icon: 'Swords' as const, title: 'Une aventure unique chaque matin', desc: 'Générée par IA pour toi et toi seul. Elle change chaque jour, jamais pareille.' },
];

const TESTIMONIALS = [
  { icon: 'Flower' as const, name: 'Sarah, 29 ans', text: 'Jour 23. Je pensais être une fille sociable. J\'ai réalisé que non. Maintenant je le suis vraiment.' },
  { icon: 'Building2' as const, name: 'Marc, 34 ans', text: 'En 3 semaines j\'ai découvert 8 restos, 3 musées et un nouvel ami. À Paris où j\'habite depuis 10 ans.' },
  { icon: 'Sparkles' as const, name: 'Camille, 26 ans', text: 'Je pensais que j\'aimais rester chez moi. J\'aimais juste avoir peur de sortir. Grosse différence.' },
];

const EXAMPLE_QUESTS = [
  { icon: 'Camera' as const, title: 'L\'Explorateur Urbain', city: 'Bordeaux · 21°C', mission: 'Passe 1h dans un quartier que tu traverses sans jamais t\'y arrêter. Photographie 5 choses qui t\'étonnent.', duration: '1h30', outdoor: true },
  { icon: 'Coffee' as const, title: 'Le Café des Étrangers', city: 'Paris · 14°C', mission: 'Va dans un café que tu ne connais pas. Commande quelque chose que tu ne prends jamais. Reste 45 minutes sans ton téléphone.', duration: '1h', outdoor: false },
  { icon: 'Mic' as const, title: 'Ta Voix, une Fois', city: 'Marseille · 23°C', mission: 'Appelle quelqu\'un à qui tu penses depuis longtemps mais que tu n\'as pas contacté. Dis-lui que tu pensais à lui.', duration: '30 min', outdoor: false },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-grid" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }} />
          <div className="absolute top-40 left-1/4 w-[300px] h-[200px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #f97316 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-violet-300 mb-8"
            style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.25)' }}>
            <Icon name="Dices" size="sm" /> Une nouvelle quête chaque matin
          </div>

          <h1 className="font-display font-black text-5xl md:text-7xl leading-[1.05] text-white mb-6">
            Vis des aventures{' '}
            <span className="text-gradient">inattendues</span>,{' '}
            chaque jour.
          </h1>

          <p className="text-xl text-gray-400 leading-relaxed max-w-xl mx-auto mb-10">
            Dopamode crée ta quête quotidienne en fonction de{' '}
            <span className="text-gray-200 font-medium">ta météo</span>,{' '}
            <span className="text-gray-200 font-medium">ta ville</span> et{' '}
            <span className="text-gray-200 font-medium">qui tu deviens</span>.{' '}
            Tu ne sais jamais ce qui t'attend — et c'est ça qui est beau.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/onboarding" className="btn btn-cta btn-lg text-base w-full sm:w-auto">
              Je veux ma première quête →
            </Link>
            <Link href="#comment" className="btn btn-ghost btn-lg w-full sm:w-auto">
              Comment ça marche ?
            </Link>
          </div>

          {/* Mock quest card */}
          <div className="max-w-sm mx-auto text-left quest-glow card rounded-3xl overflow-hidden">
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-violet-400 font-semibold">{DEMO_QUEST.phase}</span>
                <span className="text-xs text-gray-600 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  {DEMO_QUEST.weather} · {DEMO_QUEST.city}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name={DEMO_QUEST.icon} size="lg" className="text-violet-400 flex-shrink-0" />
                <h3 className="font-display font-black text-white text-lg">{DEMO_QUEST.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{DEMO_QUEST.mission}</p>
              <div className="rounded-xl px-3 py-2 mb-4 border-l-2 border-violet-500"
                style={{ background: 'rgba(139,92,246,.06)' }}>
                <p className="text-violet-400 text-xs italic">" {DEMO_QUEST.hook} "</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,.04)', color: '#9991b8', border: '1px solid rgba(255,255,255,.07)' }}>
                  <Icon name="Clock" size="xs" /> {DEMO_QUEST.duration}
                </span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="btn btn-cta btn-md w-full text-sm pointer-events-none select-none">
                C'est ma quête — je relève le défi !
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="comment" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="label mb-3">Comment ça marche</p>
            <h2 className="font-display font-black text-4xl md:text-5xl text-white">
              En 2 minutes, tu es prêt.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="card card-hover rounded-3xl p-8 flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-violet-400"
                  style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)' }}>
                  <Icon name={s.icon} size="xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-400 mb-2">Étape {i + 1}</p>
                  <h3 className="font-display font-bold text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUEST EXAMPLES
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] opacity-10"
            style={{ background: 'radial-gradient(ellipse, #f97316 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="label mb-3">Exemples de quêtes</p>
            <h2 className="font-display font-black text-4xl md:text-5xl text-white">
              Différentes chaque jour,<br />
              <span className="text-warm">adaptées à toi.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {EXAMPLE_QUESTS.map((q, i) => (
              <div key={i} className="card card-hover rounded-2xl p-5 flex items-start gap-4">
                <div className="flex-shrink-0 mt-1"><Icon name={q.icon} size="lg" className="text-violet-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className="font-display font-bold text-white">{q.title}</h3>
                    <span className="text-xs text-gray-500 px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                      {q.city}
                    </span>
                    {q.outdoor && (
                      <span className="text-xs font-medium flex items-center gap-1" style={{ color: '#10b981' }}><Icon name="TreePine" size="xs" /> Extérieur</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{q.mission}</p>
                </div>
                <div className="text-xs text-gray-600 flex-shrink-0 text-right flex items-center gap-1 justify-end">
                  <Icon name="Clock" size="xs" /> {q.duration}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            Ces quêtes sont des exemples. Les tiennes seront générées en temps réel, adaptées à ta météo et ta ville.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="label mb-3">Ce que ça change</p>
            <h2 className="font-display font-black text-4xl text-white">
              Ils ont osé. Et ça a changé quelque chose.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card card-hover rounded-3xl p-6 flex flex-col gap-4">
                <p className="text-gray-300 text-sm leading-relaxed italic flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-violet-400"
                    style={{ background: 'rgba(139,92,246,.15)' }}>
                    <Icon name={t.icon} size="sm" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card rounded-[32px] p-12 relative overflow-hidden"
            style={{ borderColor: 'rgba(139,92,246,.2)' }}>
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 opacity-5"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, #8b5cf6, transparent 70%)' }} />
            </div>
            <div className="relative">
              <div className="mb-6"><Icon name="Map" size="2xl" className="text-violet-400 mx-auto" /></div>
              <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-4">
                Ta première aventure<br />t'attend ce soir.
              </h2>
              <p className="text-gray-400 mb-8 text-lg">
                Gratuit. 2 minutes pour commencer. Ta vie ordinaire devient extraordinaire.
              </p>
              <Link href="/onboarding" className="btn btn-cta btn-lg text-base inline-flex">
                Commencer maintenant — c'est gratuit →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center py-10 text-xs text-gray-700 px-4"
        style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
        <p className="font-bold text-gray-600 mb-1">Dopamode</p>
        <p>Transforme ton quotidien en aventure · Zéro algorithme visible · 100% toi.</p>
      </footer>
    </div>
  );
}
