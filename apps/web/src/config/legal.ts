/**
 * Identité de l’éditeur et contacts légaux — renseigner via les variables
 * NEXT_PUBLIC_LEGAL_* en production (voir `.env.example`).
 * Tant qu’une valeur est absente, les pages légales affichent une mention explicite à compléter.
 */
function env(k: string): string | null {
  const v = process.env[k]?.trim();
  return v ? v : null;
}

export const legalPublisher = {
  companyName: env('NEXT_PUBLIC_LEGAL_COMPANY_NAME'),
  /** Ex. « SAS », « EURL », « Entrepreneur individuel » */
  legalForm: env('NEXT_PUBLIC_LEGAL_FORM'),
  /** Adresse du siège (multiligne possible avec \n) */
  address: env('NEXT_PUBLIC_LEGAL_ADDRESS'),
  siret: env('NEXT_PUBLIC_LEGAL_SIRET'),
  /** Ex. « RCS Paris 123 456 789 » */
  rcs: env('NEXT_PUBLIC_LEGAL_RCS'),
  /** Numéro TVA intracommunautaire si applicable */
  vatNumber: env('NEXT_PUBLIC_LEGAL_VAT'),
  /** Contact données / service client */
  contactEmail: env('NEXT_PUBLIC_LEGAL_CONTACT_EMAIL'),
  /** Délégué à la protection des données — si désigné */
  dpoEmail: env('NEXT_PUBLIC_LEGAL_DPO_EMAIL'),
  /** Directeur de la publication (nom ou fonction) */
  publicationDirector: env('NEXT_PUBLIC_LEGAL_DIRECTOR'),
};

/** Hébergeur du site (LCEN) — personnalisable */
export const hostingProvider = {
  name: env('NEXT_PUBLIC_LEGAL_HOST_NAME') ?? 'Vercel Inc.',
  address:
    env('NEXT_PUBLIC_LEGAL_HOST_ADDRESS') ??
    '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
  website: env('NEXT_PUBLIC_LEGAL_HOST_WEBSITE') ?? 'https://vercel.com',
};

export function hasPublisherIdentity(): boolean {
  return Boolean(legalPublisher.companyName && legalPublisher.address && legalPublisher.contactEmail);
}
