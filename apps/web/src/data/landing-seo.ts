/** Contenu SEO / FAQ — réutilisé par la page et le JSON-LD. */

export type FaqItem = { question: string; answer: string };

export const LANDING_FAQ: FaqItem[] = [
  {
    question: 'En quoi une quête Dopamode diffère-t-elle d’une simple liste de tâches ?',
    answer:
      'Chaque matin tu reçois une mission courte, calibrée sur ton profil, ton style de jeu et le niveau de défi que tu t’es choisi. L’objectif : une petite action réalisable dans la vraie vie, avec une fin claire — pas une todo qui s’allonge sans fin.',
  },
  {
    question: 'Puis-je commencer sur le web et continuer sur l’app ?',
    answer:
      'Oui. Un seul compte : tu peux créer ton profil sur le web, installer l’app plus tard et te reconnecter, ou l’inverse. Tes quêtes et ta progression restent cohérentes.',
  },
  {
    question: 'L’app est-elle gratuite ?',
    answer:
      'Tu peux commencer gratuitement pour calibrer ton profil et découvrir le fonctionnement. Si des options payantes arrivent plus tard, elles seront indiquées clairement dans l’app.',
  },
  {
    question: 'Comment Dopamode personnalise-t-il mes quêtes ?',
    answer:
      'À partir de ton profil et des réglages que tu acceptes dans l’app, les missions sont ajustées pour rester réalistes pour toi — ni trop molles, ni injouables. Tu gardes la main sur ce que tu tentes vraiment.',
  },
  {
    question: 'Dopamode remplace-t-il un professionnel de santé ou un coach ?',
    answer:
      'Non. Dopamode est un outil de motivation et de structure, pas un dispositif médical ou psychologique. Si tu traverses une difficulté sérieuse, parle-en à un professionnel de santé.',
  },
  {
    question: 'Pour qui est-ce pensé ?',
    answer:
      'Pour les adultes qui veulent bouger un peu plus dans leur semaine, avec des défis légers et du fun — sans culpabiliser. Utile si tu aimes les jeux, les quêtes et les petites victoires concrètes.',
  },
];
