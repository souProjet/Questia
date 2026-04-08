import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { hostingProvider, legalPublisher } from '@/config/legal';
import { IncompleteNotice, LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Éditeur du site Questia, hébergement, propriété intellectuelle et contact.',
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  const p = legalPublisher;
  const needsCompletion = !p.companyName || !p.address || !p.contactEmail;

  return (
    <LegalLayout
      title="Mentions légales"
      description="Informations exigées par la réglementation française (notamment LCEN) pour le site questia.fr et les applications associées."
    >
      {needsCompletion ? <IncompleteNotice /> : null}

      <section>
        <h2 className="text-xl font-black text-slate-900">1. Éditeur du site et de l'application</h2>
        <ul className="mt-3 list-none space-y-2 pl-0">
          <li>
            <strong>Raison sociale ou dénomination :</strong>{' '}
            {p.companyName ?? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-950">[À compléter : NEXT_PUBLIC_LEGAL_COMPANY_NAME]</span>
            )}
          </li>
          <li>
            <strong>Forme juridique :</strong>{' '}
            {p.legalForm ?? <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_FORM]</span>}
          </li>
          <li>
            <strong>Siège social / adresse :</strong>{' '}
            {p.address ? (
              <span className="whitespace-pre-line">{p.address}</span>
            ) : (
              <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_ADDRESS]</span>
            )}
          </li>
          {p.siret ? (
            <li>
              <strong>SIREN / SIRET :</strong> {p.siret}
            </li>
          ) : (
            <li>
              <strong>Immatriculation :</strong>{' '}
              <span className="text-amber-800">[À compléter si applicable : NEXT_PUBLIC_LEGAL_SIRET / NEXT_PUBLIC_LEGAL_RCS]</span>
            </li>
          )}
          {p.rcs ? (
            <li>
              <strong>RCS :</strong> {p.rcs}
            </li>
          ) : null}
          {p.vatNumber ? (
            <li>
              <strong>TVA intracommunautaire :</strong> {p.vatNumber}
            </li>
          ) : null}
          <li>
            <strong>Contact :</strong>{' '}
            {p.contactEmail ? (
              <a href={`mailto:${p.contactEmail}`} className="font-semibold text-orange-600 hover:underline">
                {p.contactEmail}
              </a>
            ) : (
              <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_CONTACT_EMAIL]</span>
            )}
          </li>
          <li>
            <strong>Directeur de la publication :</strong>{' '}
            {p.publicationDirector ?? (
              <span className="text-amber-800">[À compléter : NEXT_PUBLIC_LEGAL_DIRECTOR]</span>
            )}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">2. Hébergement</h2>
        <p>
          Le site et l'API sont hébergés par <strong>{hostingProvider.name}</strong>, {hostingProvider.address}. Site web
          du prestataire :{' '}
          <a href={hostingProvider.website} className="font-semibold text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {hostingProvider.website}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">3. Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du site et de l'application Questia (textes, graphismes, logo, structure, base de données
          produite par l'éditeur, etc.) sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou
          représentation non autorisée est interdite sous réserve des exceptions légales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-slate-900">4. Liens utiles</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/legal/confidentialite" className="font-semibold text-orange-600 hover:underline">
              Politique de confidentialité
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
    </LegalLayout>
  );
}
