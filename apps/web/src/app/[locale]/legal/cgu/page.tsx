import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Modalités d'accès et d'usage du service Questia (site web et applications).",
  robots: { index: true, follow: true },
};

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation (CGU)"
      description="Les présentes conditions régissent l'accès au service Questia. En créant un compte ou en utilisant l'application, tu les acceptes."
    >
      <section>
        <h2 className="text-xl font-black text-slate-900">1. Objet</h2>
        <p>
          Questia propose une expérience de <strong>quêtes ludiques</strong> dans la vie réelle, avec contenu
          personnalisé (y compris par intelligence artificielle). Le service comprend un site web et des applications
          mobiles, soumis aux présentes CGU et à la{' '}
          <Link href="/legal/confidentialite" className="font-semibold text-orange-600 hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">2. Compte et authentification</h2>
        <p>
          L'accès au compte est fourni par un prestataire d'authentification tiers (Clerk). Tu t'engages à fournir des
          informations exactes et à préserver la confidentialité de tes identifiants. Toute activité réalisée depuis ton
          compte est réputée effectuée par toi.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">3. Contenu généré et usage responsable</h2>
        <p>
          Les missions et textes peuvent être générés automatiquement. Ils constituent des <strong>suggestions de
          divertissement</strong>, sans valeur de conseil médical, psychologique, juridique ou professionnel. Tu restes
          responsable de tes choix dans la vie réelle. Consulte la page{' '}
          <Link href="/legal/bien-etre" className="font-semibold text-orange-600 hover:underline">
            Bien-être et limites
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">4. Monnaie virtuelle et boutique</h2>
        <p>
          La boutique peut proposer des achats en « Quest Coins » (monnaie virtuelle) et, le cas échéant, des recharges
          réelles via un prestataire de paiement. Les conditions financières et de rétractation applicables aux achats
          payants sont précisées dans les{' '}
          <Link href="/legal/cgv" className="font-semibold text-orange-600 hover:underline">
            conditions générales de vente
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">5. Propriété intellectuelle</h2>
        <p>
          Le service, ses marques et ses contenus édités par Questia sont protégés. Tu obtiens un droit personnel,
          non exclusif et révocable d'utiliser le service conformément aux CGU. Tu ne dois pas extraire massivement les
          données, faire de l'ingénierie inverse nuisible, ou contourner les mesures de sécurité.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">6. Disponibilité et évolution</h2>
        <p>
          Le service est fourni « en l'état ». Nous pouvons modifier des fonctionnalités, suspendre temporairement l'accès
          pour maintenance ou mettre fin au service avec un préavis raisonnable lorsque c'est possible.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">7. Responsabilité</h2>
        <p>
          Dans les limites autorisées par la loi, la responsabilité de l'éditeur ne saurait être engagée pour des dommages
          indirects ou pour des imprécisions du contenu généré. Rien dans les CGU ne limite les droits impératifs du
          consommateur.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">8. Résiliation</h2>
        <p>
          Tu peux supprimer ton compte depuis les paramètres du profil sur le web. Nous pouvons suspendre ou clôturer un
          compte en cas de manquement grave aux présentes conditions ou d'usage abusif.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">9. Droit applicable et litiges</h2>
        <p>
          Sous réserve de dispositions impératives plus protectrices pour le consommateur, les présentes CGU sont régies
          par le <strong>droit français</strong>. En cas de différend, les tribunaux français sont compétents, sous
          réserve des règles de compétence des juridictions de consommation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">10. Contact</h2>
        <p>
          Pour toute question relative aux CGU : utilise les coordonnées indiquées dans les{' '}
          <Link href="/legal/mentions-legales" className="font-semibold text-orange-600 hover:underline">
            mentions légales
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
