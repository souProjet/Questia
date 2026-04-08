import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { legalPublisher } from '@/config/legal';
import { siteUrl } from '@/config/marketing';
import { IncompleteNotice } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    "Comment Questia traite tes données personnelles, l'usage de l'IA, tes droits RGPD et les moyens d'export ou de suppression.",
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
        <p className="text-sm font-semibold text-slate-500 mb-2">
          <Link href="/" className="text-orange-600 hover:underline">
            ← Accueil
          </Link>
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-slate-600 mb-10">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}
          Site :{' '}
          <a href={siteUrl} className="text-orange-600 hover:underline">
            {siteUrl}
          </a>
        </p>

        {!legalPublisher.companyName || !legalPublisher.contactEmail ? <IncompleteNotice /> : null}

        <div className="prose prose-slate max-w-none space-y-10 text-slate-800">
          <section>
            <h2 className="text-xl font-black text-slate-900 mt-0">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles collectées dans le cadre de Questia est l'éditeur du
              service, tel qu'identifié dans les{' '}
              <Link href="/legal/mentions-legales" className="font-semibold text-orange-600 hover:underline">
                mentions légales
              </Link>
              .
            </p>
            <ul className="list-none space-y-2 pl-0 text-slate-800">
              <li>
                <strong>Dénomination :</strong>{' '}
                {legalPublisher.companyName ?? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-950">
                    [À compléter : NEXT_PUBLIC_LEGAL_COMPANY_NAME]
                  </span>
                )}
              </li>
              <li>
                <strong>Adresse :</strong>{' '}
                {legalPublisher.address ? (
                  <span className="whitespace-pre-line">{legalPublisher.address}</span>
                ) : (
                  <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_ADDRESS]</span>
                )}
              </li>
              <li>
                <strong>Contact (données personnelles) :</strong>{' '}
                {legalPublisher.contactEmail ? (
                  <a href={`mailto:${legalPublisher.contactEmail}`} className="font-semibold text-orange-600 hover:underline">
                    {legalPublisher.contactEmail}
                  </a>
                ) : (
                  <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_CONTACT_EMAIL]</span>
                )}
              </li>
              <li>
                <strong>Délégué à la protection des données (DPO) :</strong>{' '}
                {legalPublisher.dpoEmail ? (
                  <a href={`mailto:${legalPublisher.dpoEmail}`} className="font-semibold text-orange-600 hover:underline">
                    {legalPublisher.dpoEmail}
                  </a>
                ) : (
                  <span className="text-slate-600">
                    Non désigné — pour toute demande relative à tes données, utilise le contact ci-dessus.
                  </span>
                )}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">2. Données collectées</h2>
            <p>Nous traitons notamment :</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Compte et authentification</strong> : identifiant technique, adresse e-mail et données fournies
                lors de l'inscription ou de la connexion (via notre prestataire d'authentification Clerk).
              </li>
              <li>
                <strong>Profil de jeu</strong> : préférences d'onboarding (axes explorateur / prudence, personnalité
                déclarée), progression (jour, phase, XP, badges), historique de quêtes, paramètres de rappels et de
                boutique (thèmes, solde de monnaie virtuelle, etc.).
              </li>
              <li>
                <strong>Questionnaire de raffinement</strong> (optionnel) : réponses aux questions pour adapter le ton
                des missions, avec date de consentement lorsque applicable.
              </li>
              <li>
                <strong>Contexte des quêtes</strong> : ville ou zone approximative, météo, éventuellement coordonnées
                approximatives si tu les partages pour personnaliser une sortie ; lieux suggérés pour des missions
                extérieures.
              </li>
              <li>
                <strong>Notifications</strong> : jetons d'appareil pour les rappels push (mobile), si tu les actives.
              </li>
              <li>
                <strong>Paiements</strong> : références de transaction via notre prestataire de paiement (Stripe) ; nous
                ne stockons pas ton numéro de carte bancaire complet.
              </li>
              <li>
                <strong>Données techniques</strong> : journaux et métadonnées nécessaires à la sécurité et au bon
                fonctionnement du service (adresse IP, horodatage, erreurs), dans les limites du strict nécessaire.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">3. Finalités et bases légales</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Exécution du contrat</strong> : fournir les quêtes, la progression, la boutique et le compte.
              </li>
              <li>
                <strong>Intérêt légitime</strong> : sécurité, lutte contre la fraude, amélioration du produit,
                statistiques agrégées.
              </li>
              <li>
                <strong>Consentement</strong> : lorsque requis (ex. questionnaire de raffinement, certaines
                notifications marketing si proposées), retirable à tout moment sans affecter la licéité des traitements
                antérieurs.
              </li>
              <li>
                <strong>Obligations légales</strong> : conservation de pièces comptables ou réponses aux autorités
                lorsque la loi l'impose.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">4. Contenu généré par intelligence artificielle</h2>
            <p>
              Certaines missions et textes affichés sont <strong>produits par des modèles d'IA</strong> (ex. OpenAI)
              à partir de ton profil, du contexte du jour (météo, lieu) et de règles internes. Ce contenu est une{' '}
              <strong>suggestion ludique</strong> : il peut parfois être inadapté ou imprécis ; tu restes seul·e
              responsable de tes choix dans la vie réelle. Questia ne fournit pas de conseil médical, psychologique ou
              juridique.
            </p>
            <p>
              Nous appliquons des <strong>garde-fous dans les prompts</strong> (interdiction de contenus dangereux ou
              illégaux, limitation des conseils de santé, pas de collecte de données sensibles via les missions). Ces
              mesures réduisent les risques mais ne garantissent pas un résultat parfait : signale tout contenu problématique
              via le support.
            </p>
            <p>
              Pour le cadre d'usage (ludique, non médical) : voir aussi la page{' '}
              <Link href="/legal/bien-etre" className="text-orange-600 font-semibold hover:underline">
                Bien-être et limites
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">5. Sous-traitants et transferts</h2>
            <p>
              Nous faisons appel à des prestataires de confiance (hébergement, base de données, authentification, envoi
              d'e-mails, IA, paiements). Certains peuvent être situés hors de l'Espace économique européen : dans ce cas,
              nous mettons en place des garanties appropriées (clauses types de la Commission européenne ou équivalent).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">6. Durée de conservation</h2>
            <p>
              Les données sont conservées le temps nécessaire aux finalités ci-dessus. En cas de clôture de compte, les
              données associées sont supprimées ou anonymisées dans des délais raisonnables, sous réserve des obligations
              légales (ex. facturation).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">7. Tes droits (RGPD)</h2>
            <p>Tu disposes notamment des droits suivants : accès, rectification, effacement, limitation, opposition,
              portabilité, et retrait du consentement lorsqu'il sert de base. Tu peux introduire une réclamation auprès de
              l'autorité de protection des données (en France : la CNIL).</p>
            <p>
              <strong>Export des données</strong> : depuis la page Profil de l'application web connectée, tu peux
              télécharger un fichier JSON regroupant les informations principales liées à ton compte.
            </p>
            <p>
              <strong>Suppression du compte</strong> : la même page permet de demander la suppression définitive de ton
              compte et des données de jeu associées. La suppression du compte d'authentification est également
              effectuée côté prestataire (Clerk), sous réserve de contraintes techniques exceptionnelles (dans ce cas,
              contacte le support).
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-black text-slate-900">8. Cookies et traceurs</h2>
            <p>
              Le site utilise des cookies ou stockages locaux nécessaires au fonctionnement (session, préférences) et,
              le cas échéant, à la mesure d'audience. Un bandeau d'information peut s'afficher lors de ta première
              visite. Les paramètres de ton navigateur te permettent de limiter les cookies lorsque la loi l'autorise.
            </p>
            <p>
              Si tu acceptes le <strong>non essentiel</strong> via le bandeau, des cookies ou identifiants peuvent être
              déposés par des prestataires tiers pour la mesure d'audience (ex. Google Analytics 4 — directement ou via
              Google Tag Manager) et/ou la publicité et le remarketing (ex. Meta Pixel, tags publicitaires
              configurés dans GTM). Ces choix sont stockés localement dans ton navigateur et peuvent être modifiés en
              effaçant les données du site ou via les paramètres du navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">9. Mineurs</h2>
            <p>
              Le service ne s'adresse pas aux personnes de moins de 13 ans (ou l'âge légal de consentement numérique dans
              ton pays). Si tu es parent et penses qu'un enfant nous a transmis des données, contacte-nous pour qu'elles
              soient supprimées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900">10. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. La date en tête de page indique la dernière révision. En cas de
              changement majeur, nous pourrons t'en informer par un message dans l'app ou par e-mail.
            </p>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-xl font-black text-slate-900">Documents associés</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <Link href="/legal/mentions-legales" className="font-semibold text-orange-600 hover:underline">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/legal/cgu" className="font-semibold text-orange-600 hover:underline">
                  Conditions générales d'utilisation
                </Link>
              </li>
              <li>
                <Link href="/legal/cgv" className="font-semibold text-orange-600 hover:underline">
                  Conditions générales de vente
                </Link>
              </li>
              <li>
                <Link href="/legal/bien-etre" className="font-semibold text-orange-600 hover:underline">
                  Bien-être et limites d'usage
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
