import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { siteUrl } from '@/config/marketing';

export const metadata: Metadata = {
  title: 'Bien-être et limites',
  description:
    'Questia est une application ludique : pas de conseil médical ni psychologique. Utilisation responsable et transparence sur la motivation et l’IA.',
  robots: { index: true, follow: true },
};

export default function BienEtrePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
        <p className="text-sm font-semibold text-slate-500 mb-2">
          <Link href="/" className="text-orange-600 hover:underline">
            ← Accueil
          </Link>
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          Bien-être et limites d’usage
        </h1>
        <p className="text-sm text-slate-600 mb-10">
          Page d’information —{' '}
          <a href={siteUrl} className="text-orange-600 hover:underline">
            {siteUrl}
          </a>
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-800">
          <section>
            <h2 className="text-xl font-black text-slate-900 mt-0">Nature du service</h2>
            <p>
              Questia est une application de <strong>divertissement et de motivation</strong> dans la vie quotidienne. Les
              quêtes proposées sont des <strong>jeux de rôle légers</strong> et des défis personnels, pas des traitements,
              exercices thérapeutiques ou programmes de santé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">Pas de conseil médical ou psychologique</h2>
            <p>
              Rien dans Questia ne remplace un avis de <strong>médecin</strong>, de{' '}
              <strong>psychologue</strong>, de psychiatre ou d’un autre professionnel de santé qualifié. En cas de douleur,
              de symptômes, de détresse psychologique ou de situation d’urgence, contacte les services de secours ou un
              professionnel de santé. En France, le numéro d’urgence est le <strong>15</strong> (SAMU) ou le{' '}
              <strong>112</strong> (Europe).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">Contenu généré par intelligence artificielle</h2>
            <p>
              Des textes (missions, accroches) peuvent être <strong>générés automatiquement</strong>. Ils peuvent être
              imprécis, mal adaptés à ta situation ou à un moment donné. Tu restes responsable de tes choix dans la vie
              réelle (lieux, interactions, effort physique). Interromps toute activité qui te met mal à l’aise ou en
              danger.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">Utilisation responsable</h2>
            <p>
              Respecte la loi, le droit d’autrui et les règles des lieux publics. Les quêtes extérieures supposent une
              appréciation de ta forme et des conditions (météo, visibilité, sécurité). Ne te mets pas en situation
              d’intrusion, de conduite dangereuse ou de mise en danger.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">Liens utiles</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <Link href="/legal/confidentialite" className="text-orange-600 font-semibold hover:underline">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                Contact / support : utilise les coordonnées indiquées sur le site ou dans l’application pour signaler un
                contenu inapproprié ou poser une question.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
