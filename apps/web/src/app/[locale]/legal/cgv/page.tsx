import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description:
    "Modalités d'achat de monnaie virtuelle et produits numériques sur Questia (Stripe, Quest Coins).",
  robots: { index: true, follow: true },
};

export default function CgvPage() {
  return (
    <LegalLayout
      title="Conditions générales de vente (CGV)"
      description="Règles applicables aux achats réalisés sur Questia (recharges et achats en monnaie virtuelle)."
    >
      <section>
        <h2 className="text-xl font-black text-slate-900">1. Champ d'application</h2>
        <p>
          Les présentes CGV s'appliquent aux ventes conclues avec l'éditeur de Questia (voir{' '}
          <Link href="/legal/mentions-legales" className="font-semibold text-orange-600 hover:underline">
            mentions légales
          </Link>
          ) pour la fourniture de <strong>contenus et crédits numériques</strong> (notamment recharge de « Quest Coins »
          via le prestataire Stripe, et achats dans la boutique au moyen de cette monnaie virtuelle).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">2. Prix et paiement</h2>
        <p>
          Les prix sont indiqués en euros TTC lorsque la loi l'exige. Le paiement des recharges en ligne est traité par
          notre prestataire <strong>Stripe</strong> ; nous ne conservons pas ton numéro de carte bancaire complet sur nos
          serveurs. Les achats effectués en Quest Coins débitent ton solde de monnaie virtuelle affiché dans l'application.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">3. Livraison et exécution</h2>
        <p>
          Les crédits et déblocages numériques sont généralement attribués <strong>sans délai</strong> après confirmation
          du paiement par le prestataire. En cas d'incident technique, tu peux contacter le support aux coordonnées des
          mentions légales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">4. Droit de rétractation (consommateurs)</h2>
        <p>
          Pour les <strong>contenus numériques fournis immédiatement</strong> après achat et avec ton accord exprès à
          l'exécution anticipée du contrat, le droit de rétractation de quatorze jours peut être <strong>épuisé</strong>{' '}
          dès la fourniture du contenu, conformément au code de la consommation (article L221-28). Pour toute question sur
          un paiement récent, contacte-nous sans délai.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">5. Monnaie virtuelle</h2>
        <p>
          Les Quest Coins sont une monnaie virtuelle utilisable dans l'application selon les règles affichées en boutique.
          Ils n'ont pas de valeur en dehors du service, ne sont pas remboursables en espèces sauf obligation légale, et
          peuvent être soumis à des conditions d'usage (expiration éventuelle, non-transférabilité — selon ce qui est
          indiqué dans l'app au moment de l'achat).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">6. Réclamations et médiation</h2>
        <p>
          Tu peux adresser une réclamation aux coordonnées de l'éditeur (mentions légales). En cas de litige de
          consommation, des modalités de médiation peuvent s'appliquer conformément au droit en vigueur ; les informations
          sur la plateforme européenne RLL peuvent être communiquées lorsque l'éditeur y est tenu.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">7. Loi applicable</h2>
        <p>
          Les présentes CGV sont soumises au <strong>droit français</strong>, sans préjudice des dispositions
          impératives protectrices du consommateur dans ton pays de résidence.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">8. Liens</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/legal/cgu" className="font-semibold text-orange-600 hover:underline">
              Conditions générales d'utilisation
            </Link>
          </li>
          <li>
            <Link href="/legal/confidentialite" className="font-semibold text-orange-600 hover:underline">
              Politique de confidentialité
            </Link>
          </li>
        </ul>
      </section>
    </LegalLayout>
  );
}
