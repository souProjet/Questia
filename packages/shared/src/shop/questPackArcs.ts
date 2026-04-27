/**
 * Arcs éditoriaux des packs de quêtes.
 *
 * Chaque pack possédé débloque un **parcours de 10 quêtes** organisé en
 * **3 chapitres** (3 → 4 → 3) :
 *
 *   - Chapitre 1 « Découverte »      : 3 quêtes (~30 XP chacune)
 *   - Chapitre 2 « Approfondissement » : 4 quêtes (~40 XP chacune)
 *   - Chapitre 3 « Maîtrise »         : 3 quêtes (~50 XP chacune)
 *
 * Le déblocage est **par chapitre** (toutes les quêtes du précédent
 * doivent être terminées). À l'intérieur d'un chapitre, l'ordre est
 * libre. Les quêtes du parcours se jouent **en parallèle** de la quête
 * quotidienne (rythme illimité).
 *
 * À la fin (10/10), le joueur reçoit :
 *   - un **titre exclusif** (cf. `rewardTitleId`)
 *   - un **bonus de Quest Coins** (`rewardCoins`)
 *
 * Note : ces missions sont éditoriales. La narration du moteur peut
 * venir enrichir le mission/hook au moment de l'ouverture (phase 2),
 * mais la version actuelle s'appuie directement sur ces libellés —
 * c'est ce qui garantit la cohérence du parcours et son ton.
 */

export type PackArcChapterId = 'chapter_1' | 'chapter_2' | 'chapter_3';

export interface QuestPackArcSlot {
  /** Identifiant stable, unique au sein d'un arc (ex. `c1_q2`). */
  slug: string;
  /** Icône Lucide PascalCase. */
  icon: string;
  title: { fr: string; en: string };
  mission: { fr: string; en: string };
  hook: { fr: string; en: string };
  /** Durée approximative pour affichage UI. */
  durationMinutes: number;
  /** XP gagnée à la complétion de cette quête. */
  xp: number;
  /** Mention sécurité optionnelle, affichée avant l'acceptation. */
  safetyNote?: { fr: string; en: string };
}

export interface QuestPackArcChapter {
  id: PackArcChapterId;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  slots: QuestPackArcSlot[];
}

export interface QuestPackArc {
  packId: string;
  chapters: [QuestPackArcChapter, QuestPackArcChapter, QuestPackArcChapter];
  /** Titre exclusif débloqué à la complétion (cf. `TITLES_REGISTRY`). */
  rewardTitleId: string;
  /** Bonus de Quest Coins versé à la complétion. */
  rewardCoins: number;
}

const XP_C1 = 30;
const XP_C2 = 40;
const XP_C3 = 50;

/* ─── Helpers de fabrication ──────────────────────────────────────────────── */

function ch(
  id: PackArcChapterId,
  fr: string,
  en: string,
  descFr: string,
  descEn: string,
  slots: QuestPackArcSlot[],
): QuestPackArcChapter {
  return { id, title: { fr, en }, description: { fr: descFr, en: descEn }, slots };
}

function slot(
  slug: string,
  icon: string,
  titleFr: string,
  titleEn: string,
  missionFr: string,
  missionEn: string,
  hookFr: string,
  hookEn: string,
  durationMinutes: number,
  xp: number,
  safetyFr?: string,
  safetyEn?: string,
): QuestPackArcSlot {
  return {
    slug,
    icon,
    title: { fr: titleFr, en: titleEn },
    mission: { fr: missionFr, en: missionEn },
    hook: { fr: hookFr, en: hookEn },
    durationMinutes,
    xp,
    ...(safetyFr && safetyEn ? { safetyNote: { fr: safetyFr, en: safetyEn } } : {}),
  };
}

/* ─── Arcs : Ambiances (vibes) ────────────────────────────────────────────── */

const ARC_COUPLE: QuestPackArc = {
  packId: 'pack_couple',
  rewardTitleId: 'pack_couple_master',
  rewardCoins: 200,
  chapters: [
    ch(
      'chapter_1',
      'Premiers gestes',
      'First gestures',
      'Trois micro-attentions pour réveiller la complicité du quotidien.',
      'Three micro-attentions to wake up daily complicity.',
      [
        slot(
          'c1_q1',
          'Coffee',
          'Café à deux mains',
          'Coffee, four hands',
          "Prépare une boisson chaude pour ton ou ta partenaire ce matin sans qu'iel le demande, et amène-la jusqu'à iel.",
          "Make a hot drink for your partner this morning without being asked, and bring it to them.",
          "Le geste tient en 5 minutes. C'est l'attention, pas la mise en scène.",
          "The gesture takes 5 minutes. It's the care, not the staging.",
          5,
          XP_C1,
        ),
        slot(
          'c1_q2',
          'MessageSquareHeart',
          'Le mot du jour',
          'Word of the day',
          "Avant midi, écris un message court à ton·ta partenaire sur une chose que tu aimes en iel — précise, concrète, pas un compliment générique.",
          "Before noon, send your partner a short message about one thing you love in them — specific, concrete, not a generic compliment.",
          'Pas de cœur ni d’emoji facile. Une phrase suffit.',
          'No heart, no easy emoji. One sentence is enough.',
          3,
          XP_C1,
        ),
        slot(
          'c1_q3',
          'Hand',
          'Main posée',
          'A hand resting',
          "Aujourd'hui, pose la main sur l'épaule, l'avant-bras ou le dos de ton·ta partenaire pendant 10 secondes — sans rien dire, juste être là.",
          "Today, rest a hand on your partner's shoulder, forearm or back for 10 seconds — silent, just present.",
          "Le contact long active l'attachement. C'est court mais pas furtif.",
          'Sustained touch activates attachment. Short but not furtive.',
          1,
          XP_C1,
        ),
      ],
    ),
    ch(
      'chapter_2',
      'Rituels partagés',
      'Shared rituals',
      'Quatre rendez-vous pour ancrer la relation dans le concret.',
      'Four shared rituals to ground the relationship.',
      [
        slot(
          'c2_q1',
          'Utensils',
          "Dîner sans écran",
          'Screen-free dinner',
          "Programmez un dîner cette semaine sans téléphone ni télé — même menu simple. Posez les téléphones ailleurs avant de vous asseoir.",
          'Plan a dinner this week with no phone, no TV — even with a simple menu. Drop phones elsewhere before sitting down.',
          "Pas besoin d'un grand menu. La table est la quête.",
          'No need for a fancy menu. The table is the quest.',
          45,
          XP_C2,
        ),
        slot(
          'c2_q2',
          'Footprints',
          'La balade des deux questions',
          'Two-question walk',
          "Faites une balade de 30 min ensemble. Pose-lui deux questions que tu n'as jamais posées — sur son enfance, ses peurs, ses envies.",
          'Take a 30-minute walk together. Ask two questions you have never asked — about their childhood, fears, hopes.',
          "Tu écoutes plus que tu parles. Pas de débat, juste la curiosité.",
          'Listen more than you talk. No debate, only curiosity.',
          30,
          XP_C2,
        ),
        slot(
          'c2_q3',
          'Sticker',
          'Le post-it surprise',
          'Surprise sticky note',
          "Cache un mot écrit à la main quelque part qu'iel verra dans la journée (sac, miroir, ordi). Court, sincère, sans contexte.",
          'Hide a hand-written note somewhere they will see today (bag, mirror, laptop). Short, sincere, no context.',
          'Le papier ralentit. Un mot manuscrit pèse plus qu’un SMS.',
          'Paper slows things down. A handwritten word weighs more than a text.',
          5,
          XP_C2,
        ),
        slot(
          'c2_q4',
          'CalendarHeart',
          'La case du couple',
          'A couple slot',
          "Ouvrez vos agendas et bloquez **ensemble** un créneau d'1h30 dans les 7 prochains jours — rien d'autre que vous deux.",
          'Open your calendars and block, **together**, a 90-minute slot in the next 7 days — just the two of you.',
          'Pas de programme à l’avance. Le créneau est sacré, le contenu vient après.',
          'No plan needed. The slot is sacred, the content comes later.',
          10,
          XP_C2,
        ),
      ],
    ),
    ch(
      'chapter_3',
      'Lien profond',
      'Deeper bond',
      'Trois quêtes pour faire grandir la confiance.',
      'Three quests to grow trust.',
      [
        slot(
          'c3_q1',
          'Heart',
          'La gratitude lente',
          'Slow gratitude',
          "Ce soir, dis-lui à voix haute trois choses pour lesquelles tu lui es reconnaissant·e cette semaine — concrètes, datées, vraies.",
          'Tonight, tell them out loud three things you are grateful for this week — concrete, dated, true.',
          'Tu écoutes le silence après. Ne complète pas avec un compliment plus large.',
          'Sit in the silence after. Do not soften with a bigger compliment.',
          10,
          XP_C3,
        ),
        slot(
          'c3_q2',
          'BookHeart',
          'La lettre courte',
          'Short letter',
          "Écris-lui une lettre de 10 lignes maxi — pas un mail, vraiment papier — et donne-la lui en main propre. Pas de couplet final, sois précis·e.",
          'Write them a 10-line max letter — actual paper, not email — and hand it over in person. No grand finale, stay specific.',
          "Le papier ralentit. La main propre fixe le moment.",
          'Paper slows you down. Hand delivery anchors the moment.',
          25,
          XP_C3,
        ),
        slot(
          'c3_q3',
          'Sparkles',
          'Le projet de demain',
          'Tomorrow project',
          "Posez sur la table une chose à construire ensemble dans les 90 jours (voyage court, réaménagement, défi mutuel) — décidez aujourd'hui de la première étape.",
          'Put on the table one thing you will build together in the next 90 days (short trip, redo a room, mutual challenge) — decide today on step one.',
          'Décider compte plus que rêver. Premier pas concret.',
          'Deciding matters more than dreaming. One concrete first step.',
          30,
          XP_C3,
        ),
      ],
    ),
  ],
};

const ARC_OSE: QuestPackArc = {
  packId: 'pack_ose',
  rewardTitleId: 'pack_ose_master',
  rewardCoins: 200,
  chapters: [
    ch(
      'chapter_1',
      'Mise en jambes',
      'Warm-up',
      'Trois petits oui pour s’habituer à oser.',
      'Three small "yes" to practice daring.',
      [
        slot('c1_q1', 'Mic', 'Bonjour franc',
          'Bold hello',
          "Salue à voix haute trois inconnu·es aujourd'hui (livreur, voisin, vendeur·euse) — d'une voix posée, en regardant.",
          'Greet three strangers out loud today (delivery, neighbor, shopkeeper) — calm voice, eye contact.',
          'Voix posée, pas timide ni performative.',
          'Calm voice, neither shy nor performative.',
          5, XP_C1),
        slot('c1_q2', 'Hand', 'Demande étrange polie',
          'Polite odd ask',
          "Demande à un·e inconnu·e une chose minime mais inhabituelle (un sourire, l'heure exacte, son livre préféré) — poliment, sans contexte.",
          'Ask a stranger for one tiny but unusual thing (a smile, the exact time, their favourite book) — politely, no context.',
          'Tu acceptes le « non » sans insister. La quête, c’est demander.',
          'Accept "no" without insisting. The quest is asking.',
          5, XP_C1),
        slot('c1_q3', 'Camera', 'Selfie inattendu',
          'Unexpected selfie',
          "Prends un selfie dans un endroit où tu n'oses pas habituellement (rayon de magasin, banc public, ascenseur) — cadre tranquille, geste assumé.",
          'Take a selfie in a place you usually skip (store aisle, public bench, lift) — calm framing, owned gesture.',
          "Personne ne te juge. C'est ton scénario intérieur.",
          "Nobody is judging. It's your inner script.",
          3, XP_C1),
      ],
    ),
    ch(
      'chapter_2',
      'Voix qui se pose',
      'Voice settling',
      'Quatre quêtes pour parler en public sans se cacher.',
      'Four quests to speak up without hiding.',
      [
        slot('c2_q1', 'MessageCircle', 'Le compliment honnête',
          'The honest compliment',
          "Fais un compliment précis, sincère, à quelqu'un que tu connais à peine — sur un savoir-faire, un choix, pas un physique.",
          'Give a specific, sincere compliment to someone you barely know — about a skill, a choice, not looks.',
          "Précision = vérité. Le compliment vague tombe à plat.",
          'Specific = true. Vague compliments fall flat.',
          5, XP_C2),
        slot('c2_q2', 'Hand', 'La main qui se lève',
          'The hand that rises',
          "Dans une réunion ou une discussion à plusieurs aujourd'hui, prends la parole une fois sans te le demander deux fois — sur le sujet, brièvement.",
          'In a meeting or group talk today, speak up once without second-guessing — on topic, briefly.',
          "Court vaut mieux que parfait. La quête, c’est l’élan.",
          'Brief beats perfect. The quest is the impulse.',
          15, XP_C2),
        slot('c2_q3', 'Coffee', 'Le café avec une nouvelle personne',
          'Coffee with someone new',
          "Propose un café/thé/déjeuner à quelqu'un dans ton entourage que tu trouves intéressant·e mais que tu n'as jamais invité·e seul·e.",
          "Invite someone you find interesting but have never seen one-on-one to a coffee/tea/lunch.",
          "Si l’autre dit non, l’élan reste à toi. Pas de drame.",
          "If they say no, the impulse stays yours. No drama.",
          10, XP_C2),
        slot('c2_q4', 'Megaphone', 'Le « non » net',
          'A clean "no"',
          "Cette semaine, dis « non » sans te justifier ni s'excuser à une demande qui ne te convient pas. Phrase courte, regard droit.",
          "This week, say a no without apologising or explaining to a request that does not fit. Short sentence, steady gaze.",
          "Le 'non' simple suffit. Pas besoin de raison brodée.",
          "A plain 'no' is enough. No need to embroider reasons.",
          5, XP_C2),
      ],
    ),
    ch(
      'chapter_3',
      'Geste assumé',
      'Owned action',
      'Trois quêtes plus visibles, toujours sous garde-fous.',
      'Three more visible quests, always within boundaries.',
      [
        slot('c3_q1', 'Music', 'Chanter un peu fort',
          'Sing a bit loud',
          "Aujourd'hui, chantonne pendant 30 secondes en marchant dans la rue ou en faisant la queue — voix audible, pas pour le show.",
          'Today, hum aloud for 30 seconds while walking or queuing — audible, not show-off.',
          "Tu observes ce que ça fait à l’intérieur, pas dehors.",
          'Notice what it does inside, not outside.',
          2, XP_C3),
        slot('c3_q2', 'PenTool', 'L’opinion publiée',
          'Public opinion',
          "Publie sur ton réseau ou ta story une opinion sincère sur un sujet qui te tient à cœur — 3-4 lignes, pas de provocation, ton avis.",
          'Post on your feed or story a sincere opinion on something you care about — 3-4 lines, no provocation, just yours.',
          "Le but n’est pas le like. C’est mettre ton avis dehors.",
          'The point is not the likes. It is putting your view out there.',
          15, XP_C3),
        slot('c3_q3', 'Mic', 'Mini-performance bienveillante',
          'Kind mini-performance',
          "Compose un compliment, une blague courte ou un toast adressé à voix haute à un·e ami·e/collègue, devant au moins une autre personne.",
          'Craft a compliment, a short joke or a toast spoken aloud to a friend/colleague in front of at least one other person.',
          "Bienveillance d’abord. La quête, c’est s’adresser à quelqu’un en présence d’autres.",
          'Kindness first. The quest is addressing someone in front of others.',
          10, XP_C3,
          "Si ça ne te paraît pas safe ou opportun, attends une occasion adaptée.",
          "If it does not feel safe or appropriate, wait for the right moment.",
        ),
      ],
    ),
  ],
};

const ARC_RENCONTRES: QuestPackArc = {
  packId: 'pack_rencontres',
  rewardTitleId: 'pack_rencontres_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Briser la glace', 'Break the ice',
      'Trois micro-portes ouvertes pour aller vers les autres.',
      'Three small open doors toward others.',
      [
        slot('c1_q1', 'Smile', 'Le regard qui salue',
          'A greeting glance',
          "Aujourd'hui, croise un regard, fais un sourire calme et un signe de tête à 5 inconnus dans la rue ou les transports.",
          "Today, meet 5 strangers' eyes with a calm smile and a head nod, on the street or in transit.",
          "Pas de mot. Le contact suffit. Reste détendu·e.",
          "No words. Contact is enough. Stay relaxed.",
          10, XP_C1),
        slot('c1_q2', 'MessageSquare', 'Le mot relancé',
          'A message rebooted',
          "Renvoie un message à une personne que tu n'as plus contactée depuis 3+ mois — un détail concret en lien avec elle, pas « hello ça va ».",
          "Message someone you have not contacted for 3+ months — a concrete detail tied to them, not just 'hey what's up'.",
          'Précis = sincère. Tu ne dois rien justifier.',
          'Specific = sincere. You owe no explanation.',
          5, XP_C1),
        slot('c1_q3', 'Coffee', 'Le café muet',
          'Silent coffee',
          "Va seul·e dans un café d'ici demain, prends-y une boisson, observe les gens 15 min sans téléphone — note 1 personne qui t'intrigue.",
          "Go alone to a café before tomorrow, get a drink, observe people for 15 min without your phone — write down 1 person who intrigues you.",
          "Tu n'as rien à aborder. Tu apprends à voir.",
          'Nothing to approach. You learn to see.',
          20, XP_C1),
      ],
    ),
    ch('chapter_2', 'Provoquer le déclic', 'Spark the moment',
      'Quatre quêtes pour passer du regard à l’échange.',
      'Four quests to move from a glance to an exchange.',
      [
        slot('c2_q1', 'HelpCircle', 'La question décalée',
          'The off-beat question',
          "Pose à 1 inconnu·e une question décalée mais polie aujourd'hui — pas la météo, pas l'heure : son meilleur souvenir d'enfance, son film préféré, …",
          "Ask 1 stranger a polite but off-beat question today — not weather, not time: their best childhood memory, favourite film, …",
          "Le décalé brise la glace plus vite que la banalité.",
          'Off-beat breaks ice faster than small talk.',
          5, XP_C2),
        slot('c2_q2', 'Sparkles', 'Le compliment vrai',
          'The honest compliment',
          "Fais un compliment sincère à 1 inconnu·e ou demi-connu·e sur un choix (lecture, sac, parfum, geste) — précis, court, sans suite.",
          "Give a sincere compliment to a stranger or near-acquaintance about a choice (book, bag, scent, gesture) — specific, short, no follow-up.",
          "Tu n'attends rien. Le compliment se suffit.",
          'Expect nothing. The compliment stands alone.',
          3, XP_C2),
        slot('c2_q3', 'Search', 'L’avis demandé',
          'Asking for advice',
          "Demande à un·e inconnu·e son avis sur un choix concret aujourd'hui (livre, plat, vin, itinéraire) — sa vraie réponse, pas la politesse.",
          "Ask a stranger for their opinion on a concrete choice today (book, dish, wine, route) — their real answer, not politeness.",
          'Tu écoutes la réponse jusqu’au bout.',
          'Listen to the full answer.',
          5, XP_C2),
        slot('c2_q4', 'Calendar', 'Le rendez-vous proposé',
          'A meet-up offered',
          "Propose un vrai rendez-vous (café, expo, balade) à quelqu'un que tu trouves intéressant·e dans les 14 jours — date et lieu précis dès le 1er message.",
          'Offer a real meet-up (coffee, exhibit, walk) to someone you find interesting in the next 14 days — date and place clear from message one.',
          'Précis = pris au sérieux. Si « non », ça reste un acte.',
          'Specific = taken seriously. If "no", it remains an act.',
          5, XP_C2),
      ],
    ),
    ch('chapter_3', 'Construire le lien', 'Build the bond',
      'Trois quêtes pour ne pas en rester à l’étincelle.',
      'Three quests to go beyond the spark.',
      [
        slot('c3_q1', 'Headphones', 'Écouter sans préparer la suite',
          'Listen without prepping',
          "Lors de ta prochaine vraie discussion (>15 min), écoute sans préparer ta réponse pendant qu’on te parle. Pose 1 question de relance, pas plus.",
          "On your next real conversation (>15 min), listen without preparing your reply while they speak. Ask one follow-up question, no more.",
          "C'est un exercice. La quête est interne.",
          'It is an exercise. The quest is internal.',
          20, XP_C3),
        slot('c3_q2', 'Users', 'Présenter quelqu’un',
          'Introduce someone',
          "Présente l'un·e à l'autre, IRL ou par mail/message, deux personnes qui ne se connaissent pas et que tu penses pouvoir s'apprécier.",
          'Introduce, IRL or by message, two people who do not know each other and you think might click.',
          "Tu offres un lien. Pas obligé que ça marche, juste essayer.",
          'You offer a link. It does not have to work — just try.',
          10, XP_C3),
        slot('c3_q3', 'Heart', 'Dire ce qu’on apprécie',
          "Name what you appreciate",
          "Dis à quelqu'un de récent dans ta vie pourquoi tu apprécies passer du temps avec iel — précis, en face ou par message vocal.",
          "Tell someone recent in your life why you enjoy time with them — specific, in person or by voice note.",
          'La voix porte plus qu’un texte. Vocal accepté.',
          "Voice carries further than text. Voice note ok.",
          5, XP_C3),
      ],
    ),
  ],
};

const ARC_NOCTURNE: QuestPackArc = {
  packId: 'pack_nocturne',
  rewardTitleId: 'pack_nocturne_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Lumière du soir', 'Evening light',
      'Trois quêtes pour goûter à la ville après la nuit tombée.',
      'Three quests to taste the city after dark.',
      [
        slot('c1_q1', 'Moon', 'Marche éclairée',
          'Lit walk',
          "Sors marcher 15 min entre 21h et 23h ce soir — itinéraire éclairé, pas de téléphone à la main, observe les façades qui s'allument.",
          "Walk for 15 min tonight between 9 and 11 pm — lit route, phone in pocket, watch the facades light up.",
          'Sécurité de base : itinéraire connu, sac peu visible.',
          'Base safety: familiar route, low-visibility bag.',
          15, XP_C1,
          'Choisis une rue passante et bien éclairée.',
          'Pick a busy, well-lit street.'),
        slot('c1_q2', 'Stars', 'Cinq étoiles',
          'Five stars',
          "Lève la tête ce soir et compte 5 étoiles ou éléments lumineux du ciel — depuis ton balcon, ta fenêtre ou un coin calme.",
          "Look up tonight and count 5 stars or lights in the sky — from your balcony, window or a quiet spot.",
          "Si nuageux, regarde 5 fenêtres allumées.",
          'If cloudy, count 5 lit windows instead.',
          5, XP_C1),
        slot('c1_q3', 'Coffee', 'Boisson chaude au calme',
          'Calm hot drink',
          "Prépare ce soir une boisson chaude (tisane, chocolat, déca) et bois-la sans écran pendant 10 min — fenêtre ouverte si possible.",
          'Make a hot drink tonight (herbal tea, cocoa, decaf) and drink it screen-free for 10 min — window open if you can.',
          "Tu ne fais que boire. C'est tout.",
          'Just drink. That is it.',
          10, XP_C1),
      ]),
    ch('chapter_2', 'Ville nocturne', 'Night city',
      'Quatre micro-aventures urbaines après le coucher du soleil.',
      'Four urban micro-adventures after sundown.',
      [
        slot('c2_q1', 'Music', 'Concert improvisé',
          'Improvised concert',
          "Trouve d'ici 7 jours un live musical gratuit (bar, kiosque, place, vernissage) après 20h et reste-y au moins 20 min.",
          "Find a free live music spot (bar, bandstand, square, opening) after 8 pm in the next 7 days and stay at least 20 min.",
          "Apps de city guides ou affiches de quartier, pas Google.",
          'City guide apps or neighborhood posters, not Google.',
          60, XP_C2),
        slot('c2_q2', 'Footprints', 'Quartier inconnu',
          'Unknown neighborhood',
          "Choisis un quartier de ta ville où tu ne vas jamais et balade-toi 30 min après 19h — note 3 lieux à revoir de jour.",
          "Pick a neighborhood you never visit and roam there 30 min after 7 pm — list 3 places to revisit by day.",
          "Quartier sûr et passant. Si doute, change.",
          'Safe, busy area. If in doubt, switch.',
          30, XP_C2,
          'Évite les zones désertes. Garde ton tel chargé.',
          'Avoid empty zones. Keep your phone charged.'),
        slot('c2_q3', 'Utensils', 'Le repas tardif',
          'Late dinner',
          "Mange un vrai dîner après 21h dans un endroit que tu ne connais pas (resto, food-court, bar à tapas) — seul·e ou accompagné·e.",
          'Eat a real dinner after 9 pm in a place you do not know (restaurant, food court, tapas bar) — alone or with someone.',
          "Manger seul·e tard est une fête, pas un constat.",
          'Eating late alone is a feast, not a verdict.',
          60, XP_C2),
        slot('c2_q4', 'Camera', 'Trois photos nocturnes',
          'Three night shots',
          "Sors prendre 3 photos qui n'ont de sens que la nuit (reflet, néon, rue vide). Pas pour Insta, pour toi.",
          'Step out and shoot 3 photos that only make sense at night (reflection, neon, empty street). Not for socials — for you.',
          "Le téléphone suffit. C'est l'œil qui compte.",
          'Phone is enough. The eye is what matters.',
          20, XP_C2),
      ]),
    ch('chapter_3', 'Rituel du soir', 'Evening ritual',
      'Trois quêtes pour faire de la nuit un repère.',
      'Three quests to turn night into a landmark.',
      [
        slot('c3_q1', 'BookOpen', 'Lecture sous lampe',
          'Lamp-lit reading',
          "Ce soir, lis 30 minutes (papier, pas écran) sous une seule lampe — toutes les autres lumières éteintes.",
          'Tonight, read 30 minutes (paper, not screen) under a single lamp — all other lights off.',
          "Le silence et la pénombre changent la lecture.",
          'Silence and dim light change reading.',
          30, XP_C3),
        slot('c3_q2', 'Footprints', 'Promenade tardive',
          'Late stroll',
          "Programme dans les 7 jours une marche d'une heure entre 22h et minuit (seul·e ou accompagné·e) — route éclairée, pas de but.",
          'In the next 7 days, plan a 1-hour walk between 10 pm and midnight (alone or with someone) — lit route, no goal.',
          "Le but est de marcher, pas d’arriver.",
          'The point is walking, not arriving.',
          60, XP_C3,
          "Choisis un parcours que tu connais et reste vigilant·e.",
          'Pick a route you know and stay alert.'),
        slot('c3_q3', 'Sparkles', 'Le rituel posé',
          'A settled ritual',
          "Décris en 5 lignes ton rituel de coucher idéal et applique-le ce soir : ordre des gestes, lumière, sons, pas d'écran 30 min avant.",
          "Write your ideal bedtime ritual in 5 lines and run it tonight: sequence, light, sound, no screens 30 min before.",
          "Le rituel se construit en faisant. Une seule fois suffit pour graver.",
          'Rituals are built by doing. Once is enough to engrave.',
          30, XP_C3),
      ]),
  ],
};

const ARC_PIMENT: QuestPackArc = {
  packId: 'pack_piment',
  rewardTitleId: 'pack_piment_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Sortir du rang', 'Off the line',
      'Trois quêtes pour décaler le regard public.',
      'Three quests to shift the public gaze.',
      [
        slot('c1_q1', 'Megaphone', 'Le rire à voix haute',
          'Loud laughter',
          "Quand quelque chose t'amuse aujourd'hui en public, ris vraiment fort une fois — 2 secondes, pas étouffé.",
          'When something amuses you in public today, laugh out loud once — 2 seconds, not muffled.',
          "Le rire bref recadre. Personne ne se retourne longtemps.",
          'A brief laugh resets. No one stares for long.',
          1, XP_C1),
        slot('c1_q2', 'Eye', 'Le contact visuel long',
          'The long eye contact',
          "Soutiens un contact visuel calme avec 3 inconnu·es croisé·es aujourd'hui — 3 secondes, sourire léger en finir.",
          'Hold calm eye contact with 3 strangers today — 3 seconds, end on a light smile.',
          "Calme, pas défi. Tu finis par sourire.",
          'Calm, not a challenge. End with a smile.',
          5, XP_C1),
        slot('c1_q3', 'Mic', 'Demande inhabituelle polie',
          'Polite unusual ask',
          "Aujourd'hui, en magasin, demande poliment une chose un peu inhabituelle (essayer un produit, un échantillon, un avis perso).",
          'Today, in a shop, politely ask for something a bit unusual (a try, a sample, a personal take).',
          'Polie, courte, debout droit·e. Tu acceptes le refus.',
          'Polite, short, standing tall. Accept refusal.',
          5, XP_C1),
      ]),
    ch('chapter_2', 'Voix qui pique', 'Spicy voice',
      'Quatre micro-performances assumées.',
      'Four owned micro-performances.',
      [
        slot('c2_q1', 'Music', 'Chanter dans la rue',
          'Sing on the street',
          "Chante un refrain de chanson en marchant dehors pendant 30 secondes — voix audible, juste pour toi mais pas étouffée.",
          'Sing a song chorus while walking outside for 30 seconds — audible, just for you but not muffled.',
          "Pas de spectacle. Tu n’as pas à plaire.",
          'Not a show. No need to please.',
          1, XP_C2),
        slot('c2_q2', 'PenTool', 'L’avis tranché',
          'Strong opinion',
          "Publie une opinion sincère et nuancée sur un sujet qui te tient à cœur (3-4 lignes) sur ton réseau — sans insulte, mais sans euphémisme.",
          'Post a sincere, nuanced opinion on something you care about (3-4 lines) on your feed — no insult, no euphemism.',
          "Tu attends rien. C’est le geste qui compte.",
          'Expect nothing. The gesture is the point.',
          15, XP_C2),
        slot('c2_q3', 'Hand', 'Demander un service inhabituel',
          'Ask an unusual favor',
          "Demande à un·e proche un service un peu inhabituel cette semaine (donner un avis franc, regarder un truc, t'accompagner quelque part).",
          "Ask a close one for a slightly unusual favor this week (a frank opinion, to look at something, to come along somewhere).",
          "Précis, court, sans tortiller.",
          'Precise, short, no twisting.',
          5, XP_C2),
        slot('c2_q4', 'Megaphone', 'Le toast en public',
          'A public toast',
          "Lors d'un repas avec ami·es ou famille cette semaine, lève ton verre et dis 3 phrases sur quelqu'un présent.",
          'At a meal with friends or family this week, raise your glass and say 3 sentences about someone there.',
          "Précis, sincère, court. Pas un sketch.",
          'Specific, sincere, short. Not a sketch.',
          5, XP_C2),
      ]),
    ch('chapter_3', 'Sortir le truc', 'Drop the line',
      'Trois quêtes plus visibles.',
      'Three more visible quests.',
      [
        slot('c3_q1', 'Drama', 'Improviser un personnage',
          'Improvise a character',
          "Aujourd'hui, joue 30 secondes un personnage avec une voix ou démarche différente devant 1 personne (ami·e, partenaire) — sans contexte, juste « pour voir ».",
          "Today, play a character for 30 seconds with a different voice or walk in front of 1 person (friend, partner) — no context, just 'for fun'.",
          "Pas la peine que ce soit drôle. Juste que ça soit fait.",
          'No need to be funny. Just done.',
          5, XP_C3),
        slot('c3_q2', 'Map', 'Adresse à la cantonade',
          'A public-facing line',
          "Pose une question dans un cadre public où tu hésites d'habitude (conférence, atelier, librairie en lecture) — sur le sujet, calme.",
          "Ask a question in a public setting you usually skip (conference, workshop, bookshop reading) — on topic, calm.",
          "Court vaut mieux que parfait.",
          'Brief beats perfect.',
          15, XP_C3),
        slot('c3_q3', 'Sparkles', 'Le geste qu’on remarque',
          'A noticed gesture',
          "Imagine et fais un geste un peu décalé en public (lecture à voix haute brève, danse 10 sec, déclaration) — 100% sain, choisi pour toi.",
          'Imagine and do a slightly off-beat public gesture (brief loud reading, 10-sec dance, statement) — 100% safe, chosen by you.',
          "Tu choisis ce qui te fait peur juste comme il faut, pas plus.",
          'Choose what scares you the right amount, no more.',
          10, XP_C3,
          "Si ça met quelqu’un en difficulté, change de geste.",
          'If it discomforts someone, switch gestures.'),
      ]),
  ],
};

/* ─── Arcs : Style de vie ─────────────────────────────────────────────────── */

const ARC_SOLO_ABSOLU: QuestPackArc = {
  packId: 'pack_solo_absolu',
  rewardTitleId: 'pack_solo_absolu_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Pause', 'Pause',
      'Trois quêtes pour arrêter le bruit.',
      'Three quests to stop the noise.',
      [
        slot('c1_q1', 'Phone', 'Vingt minutes sans écran',
          'Twenty screen-free minutes',
          "Aujourd'hui, pose ton téléphone et tout écran pendant 20 minutes consécutives — fais autre chose (regarder, marcher, écouter).",
          'Today, drop your phone and all screens for 20 consecutive minutes — do something else (watch, walk, listen).',
          "Mode avion ou tiroir. Le téléphone hors de vue.",
          'Plane mode or drawer. Phone out of sight.',
          20, XP_C1),
        slot('c1_q2', 'Wind', 'Une fenêtre, deux respirations',
          'A window, two breaths',
          "Ouvre une fenêtre, regarde dehors 5 minutes en silence, fais 2 respirations longues (4-7-8) — une seule fois aujourd'hui.",
          'Open a window, look outside for 5 minutes in silence, take 2 long breaths (4-7-8) — once today.',
          "Pas de méditation, juste regarder.",
          'No meditation, just looking.',
          5, XP_C1),
        slot('c1_q3', 'Coffee', 'Le repas mono-tâche',
          'Mono-task meal',
          "Mange un repas aujourd'hui sans rien faire d'autre — pas de série, pas de podcast, pas de scroll. Juste manger.",
          'Eat a meal today doing nothing else — no show, no podcast, no scroll. Just eating.',
          "Tu remarques le goût. Le silence est la quête.",
          'Notice the taste. Silence is the quest.',
          20, XP_C1),
      ]),
    ch('chapter_2', 'Présence', 'Presence',
      'Quatre quêtes pour t’habiter pleinement.',
      'Four quests to inhabit yourself.',
      [
        slot('c2_q1', 'BookOpen', 'Une demi-heure papier',
          'Thirty paper minutes',
          "Lis 30 minutes sur papier (livre, mag, BD) sans interruption — téléphone éteint ou ailleurs.",
          'Read 30 minutes on paper (book, mag, comic) uninterrupted — phone off or away.',
          "Le papier ralentit l’œil. C’est la quête.",
          'Paper slows the eye. That is the quest.',
          30, XP_C2),
        slot('c2_q2', 'Footprints', 'Marche solo silencieuse',
          'Silent solo walk',
          "Marche 30 minutes seul·e dehors — sans musique, sans podcast, sans appel. Juste écouter ce qu’il y a autour.",
          'Walk 30 minutes alone outside — no music, no podcast, no call. Just listen.',
          "Téléphone en poche, mode avion si possible.",
          'Phone in pocket, plane mode if possible.',
          30, XP_C2),
        slot('c2_q3', 'PenLine', 'Trois pages le matin',
          'Three morning pages',
          "Demain matin, écris à la main 3 pages de tout-venant (pensées, plaintes, listes, rêves) avant tout autre écran.",
          'Tomorrow morning, hand-write 3 pages of stream-of-consciousness (thoughts, gripes, lists, dreams) before any screen.',
          "Pas relire. Pas garder. C’est l’acte.",
          'No rereading. No keeping. The act is the point.',
          25, XP_C2),
        slot('c2_q4', 'Bath', 'Le rituel solo',
          'Solo ritual',
          "Programme dans les 7 jours un long rituel à toi (bain, douche longue, masque, soins) — au moins 45 min, sans écran ni interruption.",
          "Plan within 7 days a long solo ritual (bath, long shower, mask, self-care) — at least 45 min, no screens, no interruptions.",
          "Tu mérites le temps. C’est lui la quête.",
          'You deserve time. Time is the quest.',
          45, XP_C2),
      ]),
    ch('chapter_3', 'Profondeur', 'Depth',
      'Trois quêtes pour une vraie pause intérieure.',
      'Three quests for a real inner pause.',
      [
        slot('c3_q1', 'BookHeart', 'La lettre à toi-même',
          'A letter to yourself',
          "Écris-toi une lettre de 1 page sur où tu en es vraiment — à ouvrir dans 90 jours. Cachetée et datée.",
          'Write yourself a 1-page letter on where you really are — to open in 90 days. Sealed and dated.',
          "Tu ne triches pas avec toi.",
          'No cheating with yourself.',
          30, XP_C3),
        slot('c3_q2', 'Compass', 'La balade introspective',
          'Introspective walk',
          "Programme une marche solo de 90 minutes (parc, forêt, bord de mer ou ville hors heures de pointe) — emporte un carnet, pas plus.",
          'Plan a 90-minute solo walk (park, forest, seaside or off-peak city) — carry a notebook, nothing else.',
          "Phone en mode avion. Carnet pour 5 lignes max au retour.",
          'Plane mode. Notebook for 5 lines max on return.',
          90, XP_C3,
          "Préviens 1 personne du parcours et de l’horaire de retour.",
          'Tell 1 person your route and return time.'),
        slot('c3_q3', 'Sparkles', 'Le silence d’une heure',
          'An hour of silence',
          "Aménage 1 heure de silence absolu (pas musique, pas podcast, pas appel, pas réseaux) — chez toi ou dehors.",
          'Arrange 1 hour of absolute silence (no music, podcast, call, socials) — at home or outside.',
          "Tu n’as rien à produire de cette heure.",
          'You owe this hour nothing produced.',
          60, XP_C3),
      ]),
  ],
};

const ARC_GASTRONOMIE: QuestPackArc = {
  packId: 'pack_gastronomie',
  rewardTitleId: 'pack_gastronomie_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Premier goût', 'First taste',
      'Trois quêtes pour ouvrir le palais.',
      'Three quests to open your palate.',
      [
        slot('c1_q1', 'Apple', 'Un produit jamais goûté',
          'Never-tried product',
          "Aujourd'hui ou demain, achète 1 fruit, légume, fromage ou boisson que tu n'as jamais goûté·e — goûte-le seul·e ou avec quelqu'un.",
          'Today or tomorrow, buy 1 fruit, vegetable, cheese or drink you have never tasted — try it alone or with someone.',
          "Le marché ou l’épicerie de quartier, pas le supermarché.",
          'Local market or grocery, not the supermarket.',
          15, XP_C1),
        slot('c1_q2', 'Coffee', 'Le café observé',
          'Observed coffee',
          "Bois ton café/thé de demain matin assis·e, en l'observant — couleur, odeur, première gorgée, température. 5 minutes lentement.",
          'Drink tomorrow morning coffee/tea seated, observing it — color, scent, first sip, temperature. 5 slow minutes.',
          "Tu prends le temps que tu n’as pas.",
          'Take the time you do not have.',
          5, XP_C1),
        slot('c1_q3', 'Map', 'Un quartier gourmand',
          'A foodie neighborhood',
          "Choisis un quartier de ta ville réputé pour la bouffe et balade-toi y 30 min cette semaine, en notant 3 lieux à essayer.",
          "Pick a foodie neighborhood in your city and walk there 30 min this week, noting 3 places to try.",
          "Pas besoin d’acheter. Tu repères.",
          'No need to buy. You scout.',
          30, XP_C1),
      ]),
    ch('chapter_2', 'Geste de cuisine', 'Cooking gesture',
      'Quatre quêtes pour entrer dans la cuisine.',
      'Four quests to step into the kitchen.',
      [
        slot('c2_q1', 'ChefHat', 'Le plat fait maison',
          'Homemade dish',
          "Cuisine d'ici 3 jours un plat que tu n'as jamais cuisiné — recette simple, ingrédients frais.",
          'Cook within 3 days a dish you have never made — simple recipe, fresh ingredients.',
          "Pas la perfection. La main qui fait.",
          'Not perfection. The hand that does.',
          60, XP_C2),
        slot('c2_q2', 'Utensils', 'Le repas à 1 ingrédient star',
          'Star-ingredient meal',
          "Cuisine un repas autour d'un seul produit star (tomate, œuf, pâte, champignon) — accompagne-le simplement, mets-le en valeur.",
          'Cook a meal around a single star ingredient (tomato, egg, pasta, mushroom) — keep sides simple, let it shine.',
          "La sobriété met le goût en avant.",
          'Plainness brings out flavor.',
          45, XP_C2),
        slot('c2_q3', 'ShoppingBasket', 'Le panier du marché',
          'Market basket',
          "Va au marché cette semaine et compose un repas avec ce que tu n'as pas listé — 3 produits choisis sur place, intuition.",
          "Go to the market this week and build a meal from things you did not list — 3 products chosen on the spot, instinct.",
          "Le marché te choisit aussi. Laisse faire.",
          'The market chooses too. Let it.',
          60, XP_C2),
        slot('c2_q4', 'Wine', 'L’accord pensé',
          'Thoughtful pairing',
          "Choisis aujourd'hui une boisson (vin, bière, kombucha, jus) précisément pour accompagner un plat — demande conseil au caviste/épicier.",
          "Pick a drink today (wine, beer, kombucha, juice) on purpose to pair with a dish — ask the wine seller/grocer for advice.",
          "Tu écoutes leur métier. Tu testes.",
          'Listen to their craft. Test it.',
          15, XP_C2),
      ]),
    ch('chapter_3', 'Mémoire du goût', 'Memory of taste',
      'Trois quêtes pour faire de la table un souvenir.',
      'Three quests to turn the table into memory.',
      [
        slot('c3_q1', 'Users', 'Le repas pour quelqu’un',
          'A meal for someone',
          "Cuisine un repas pour quelqu'un que tu apprécies — invite, ne demande pas la moitié, sers à table.",
          'Cook a meal for someone you like — invite, do not split costs, serve at the table.',
          "L’hospitalité gratuite est devenue rare. Offre.",
          'Free hospitality has become rare. Offer it.',
          120, XP_C3),
        slot('c3_q2', 'Pen', 'Le carnet de goût',
          'Taste journal',
          "Cette semaine, tiens 5 jours un carnet de 3 lignes par jour : 1 chose mangée, 1 sensation, 1 souvenir associé.",
          'This week, keep a 3-line daily journal for 5 days: 1 thing eaten, 1 sensation, 1 associated memory.',
          "Le souvenir gustatif compte plus qu’on ne pense.",
          'Taste memory matters more than we think.',
          5, XP_C3),
        slot('c3_q3', 'Sparkles', 'Le menu signature',
          'Signature menu',
          "Compose ton « menu signature » en 4 plats que tu sais faire bien — note-les. Re-cuisine-en 1 cette semaine pour valider.",
          'Build your "signature menu" of 4 dishes you can do well — write it down. Re-cook 1 this week to confirm.',
          "Tu construis une identité de table.",
          'You build a table identity.',
          90, XP_C3),
      ]),
  ],
};

const ARC_SLOW_LIFE: QuestPackArc = {
  packId: 'pack_slow_life',
  rewardTitleId: 'pack_slow_life_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Ralentir', 'Slow down',
      'Trois micro-quêtes pour casser le rythme.',
      'Three micro-quests to break the pace.',
      [
        slot('c1_q1', 'Coffee', 'Boisson lente',
          'Slow drink',
          "Aujourd'hui, prépare ta boisson chaude lentement (laisse infuser, sens, observe la vapeur) et bois-la sans rien faire d'autre.",
          'Today, make your hot drink slowly (let it brew, smell it, watch the steam) and drink it doing nothing else.',
          "Pas de scroll en parallèle. C’est la quête.",
          'No parallel scrolling. That is the quest.',
          10, XP_C1),
        slot('c1_q2', 'Footprints', 'Marche lente',
          'Slow walk',
          "Marche 15 min à un rythme lent volontaire (50% plus lent que d'habitude) — observe ce qui change.",
          'Walk 15 min at a deliberately slow pace (50% slower than usual) — notice what changes.',
          "Tu vois plus quand tu vas moins vite.",
          'You see more when you go less fast.',
          15, XP_C1),
        slot('c1_q3', 'Wind', 'Trois respirations posées',
          'Three settled breaths',
          "À 3 moments différents aujourd'hui, fais 3 respirations longues (4-7-8) — pose le moment, puis reprends.",
          'At 3 different moments today, take 3 long breaths (4-7-8) — settle the moment, then resume.',
          "Pas une appli. Juste toi qui respires.",
          'No app. Just you breathing.',
          5, XP_C1),
      ]),
    ch('chapter_2', 'Sentir', 'Sense',
      'Quatre quêtes pour être là, vraiment.',
      'Four quests to be here, really.',
      [
        slot('c2_q1', 'Sun', 'Cinq minutes au soleil',
          'Five minutes in sun',
          "Trouve 5 minutes au soleil aujourd'hui (balcon, fenêtre, terrasse, parc) — yeux fermés, juste sentir la chaleur.",
          'Find 5 minutes in the sun today (balcony, window, terrace, park) — eyes closed, just feel warmth.',
          "Hiver = sortir 5 min reste possible.",
          'Winter = 5 min out still works.',
          5, XP_C2),
        slot('c2_q2', 'Leaf', 'Trois choses sensorielles',
          'Three sensory things',
          "Aujourd'hui, identifie 3 choses différentes par leur sensation (texture d'une pomme, odeur d'un savon, son d'un vent).",
          'Today, identify 3 different things by sensation (apple texture, soap scent, wind sound).',
          "Tu n’as pas besoin de les nommer mieux que ça.",
          'No need to name them better than that.',
          10, XP_C2),
        slot('c2_q3', 'BookOpen', 'Une heure papier',
          'One hour paper',
          "Lis 1 heure sur papier d'ici 3 jours — installation choisie (lampe, fauteuil, plaid, lumière douce).",
          'Read 1 hour on paper within 3 days — chosen setting (lamp, chair, blanket, soft light).',
          "Le confort fait la lecture.",
          'Comfort makes the read.',
          60, XP_C2),
        slot('c2_q4', 'PenLine', 'Cinq lignes du jour',
          'Five lines of the day',
          "Ce soir, écris à la main 5 lignes sur ce que tu as remarqué de bon dans la journée — pas un bilan, juste des fragments.",
          'Tonight, hand-write 5 lines on what you noticed of good today — not a recap, just fragments.',
          "Le bon est invisible quand on ne le pose pas.",
          'The good is invisible until you place it.',
          5, XP_C2),
      ]),
    ch('chapter_3', 'Habiter', 'Inhabit',
      'Trois quêtes pour ancrer la lenteur dans le quotidien.',
      'Three quests to anchor slowness in daily life.',
      [
        slot('c3_q1', 'Bath', 'Le matin lent',
          'Slow morning',
          "Choisis un matin cette semaine et prends 1h pour démarrer (boisson, douche, lecture, fenêtre) — sans téléphone avant la fin de l'heure.",
          'Pick a morning this week and take 1h to start (drink, shower, read, window) — no phone until the hour ends.',
          "Décale ton réveil de 30 min si besoin.",
          'Set your alarm 30 min earlier if needed.',
          60, XP_C3),
        slot('c3_q2', 'Trees', 'La nature loin du téléphone',
          'Nature, no phone',
          "Programme dans les 7 jours 90 min en nature (parc, forêt, bord d'eau) — phone en mode avion en arrivant.",
          'Plan within 7 days 90 min in nature (park, forest, water) — plane mode on arrival.',
          "Tu n’as rien à filmer. Tu es là.",
          'Nothing to film. You are here.',
          90, XP_C3,
          'Préviens 1 personne si tu pars seul·e.',
          'Tell 1 person if you go alone.'),
        slot('c3_q3', 'Sparkles', 'Le rituel hebdomadaire',
          'Weekly ritual',
          "Choisis 1 rituel slow à reproduire chaque semaine (jardinage, cuisine longue, bain, lecture) — fais-en la 1ère occurrence cette semaine.",
          'Pick 1 slow ritual to repeat weekly (gardening, slow cooking, bath, reading) — do the first one this week.',
          "Le rythme se gagne par répétition.",
          'Rhythm is earned by repetition.',
          60, XP_C3),
      ]),
  ],
};

const ARC_SOCIAL_AMIS: QuestPackArc = {
  packId: 'pack_social_amis',
  rewardTitleId: 'pack_social_amis_master',
  rewardCoins: 200,
  chapters: [
    ch('chapter_1', 'Reconnecter', 'Reconnect',
      'Trois gestes pour rouvrir un lien.',
      'Three gestures to reopen a bond.',
      [
        slot('c1_q1', 'MessageSquare', 'Le message à 3 mois',
          'The 3-month message',
          "Écris à un·e ami·e que tu n'as plus contacté·e depuis 3+ mois — un détail concret en lien avec lui/elle, pas « hello ».",
          "Write to a friend you have not contacted for 3+ months — a concrete detail tied to them, not 'hi'.",
          "Précis = sincère.",
          'Specific = sincere.',
          5, XP_C1),
        slot('c1_q2', 'Phone', 'Un appel court',
          'A short call',
          "Aujourd'hui, appelle 1 ami·e (pas message) pendant 5 minutes minimum — sans raison particulière.",
          'Today, call 1 friend (not text) for at least 5 minutes — no particular reason.',
          "Voix > texte pour le lien.",
          'Voice > text for bonding.',
          10, XP_C1),
        slot('c1_q3', 'Image', 'Le souvenir partagé',
          'Shared memory',
          "Envoie à 1 ami·e une photo ou un souvenir que vous avez vécu ensemble — sans ajouter beaucoup de mots.",
          'Send 1 friend a photo or memory you shared — with few words added.',
          "L’image rappelle. Pas besoin d’expliquer.",
          'The image reminds. No need to explain.',
          3, XP_C1),
      ]),
    ch('chapter_2', 'Faire vivre', 'Make it alive',
      'Quatre quêtes pour incarner les liens.',
      'Four quests to embody friendships.',
      [
        slot('c2_q1', 'Coffee', 'Le café proposé',
          'A coffee offered',
          "Propose un café/thé/déjeuner à 1 ami·e cette semaine — date et lieu précis dès le 1er message.",
          'Offer a coffee/tea/lunch to a friend this week — date and place clear from message one.',
          "Précis = pris au sérieux.",
          'Specific = taken seriously.',
          5, XP_C2),
        slot('c2_q2', 'Gift', 'L’attention concrète',
          'Concrete attention',
          "Offre une attention concrète à 1 ami·e cette semaine (livre que tu as lu, un truc utile, une heure d'aide) — pas symbolique.",
          'Give concrete attention to 1 friend this week (a book you read, a useful thing, an hour of help) — not symbolic.',
          "L’attention est plus rare que le cadeau.",
          'Attention is rarer than a gift.',
          15, XP_C2),
        slot('c2_q3', 'Users', 'L’invitation groupée',
          'A group invite',
          "Lance un plan à 3-5 ami·es pour les 14 jours (apéro, balade, ciné, jeu) — pas un sondage, une proposition claire.",
          'Pitch a plan to 3-5 friends in 14 days (drinks, walk, movie, game) — not a poll, a clear offer.',
          "Tu es l’organisateur·rice. Décide.",
          'You are the host. Decide.',
          15, XP_C2),
        slot('c2_q4', 'BookHeart', 'La carte d’amitié',
          'Friendship card',
          "Écris une carte ou un mail un peu long à 1 ami·e pour lui dire pourquoi tu l'apprécies — précis, daté, pas de mièvrerie.",
          'Write a longer card or email to 1 friend telling them why you like them — specific, dated, no sappiness.',
          "Précis vaut plus que joli.",
          'Specific beats pretty.',
          25, XP_C2),
      ]),
    ch('chapter_3', 'Approfondir', 'Deepen',
      'Trois quêtes pour aller plus loin.',
      'Three quests to go further.',
      [
        slot('c3_q1', 'Headphones', 'L’écoute pleine',
          'Full listening',
          "Lors de ta prochaine vraie discussion (>15 min) avec un·e proche, écoute sans préparer ta réponse — 1 question de relance, pas plus.",
          "On your next real talk (>15 min) with a close one, listen without prepping your reply — 1 follow-up question, no more.",
          "C’est un exercice intérieur.",
          'It is an inner exercise.',
          20, XP_C3),
        slot('c3_q2', 'HelpingHand', 'L’aide proposée d’abord',
          'Help offered first',
          "Identifie 1 ami·e qui traverse un truc et propose-lui une aide concrète — sans attendre qu'iel demande.",
          "Identify 1 friend going through something and offer concrete help — do not wait for them to ask.",
          "Précis (« je peux faire X »), pas vague.",
          "Specific ('I can do X'), not vague.",
          10, XP_C3),
        slot('c3_q3', 'Sparkles', 'Le rendez-vous régulier',
          'A standing date',
          "Avec 1 ami·e cette semaine, posez ensemble un rendez-vous récurrent (mensuel, trimestriel) — date 1 à fixer aujourd'hui.",
          "With 1 friend this week, set a recurring date (monthly, quarterly) — first date pinned today.",
          "Le récurrent fait l’amitié longue.",
          'Recurring builds long friendships.',
          15, XP_C3),
      ]),
  ],
};

/* ─── Arcs : Lieux ────────────────────────────────────────────────────────── */
/* Les parcours « lieux » fonctionnent à distance ou sur place : si tu es     */
/* dans la ville, joue-les sur le terrain ; sinon, le souvenir, l'échange     */
/* avec un·e ami·e qui y vit, ou le projet de visite remplissent la mission.  */

const ARC_PARIS: QuestPackArc = {
  packId: 'pack_paris',
  rewardTitleId: 'pack_paris_master',
  rewardCoins: 180,
  chapters: [
    ch('chapter_1', 'Premiers pas', 'First steps',
      'Trois quêtes pour s’ancrer dans Paris au-delà du cliché.',
      'Three quests to ground in Paris beyond clichés.',
      [
        slot('c1_q1', 'TramFront', 'La ligne entière',
          'The whole line',
          "Choisis une ligne de métro (4, 6, 9…) et fais-en 5 stations sans but cette semaine — descends à une station inconnue, marche 15 min.",
          "Pick a metro line (4, 6, 9…) and ride 5 stations this week with no goal — get off at an unknown stop, walk 15 min.",
          "Si tu n’es pas à Paris, regarde le plan et écris où tu serais descendu·e.",
          'If you are not in Paris, look at the map and write where you would have stepped off.',
          45, XP_C1),
        slot('c1_q2', 'Building', 'Un passage couvert',
          'A covered passage',
          "Trouve 1 passage couvert parisien (Choiseul, Verdeau, Panoramas, Vivienne…) et arpente-le 10 min en notant 3 détails.",
          'Find 1 Parisian covered passage (Choiseul, Verdeau, Panoramas, Vivienne…) and walk it 10 min, noting 3 details.',
          "Si tu n’y es pas, choisis-en 1 sur photo et raconte 3 détails que tu remarques.",
          'If not there, pick one in pictures and write 3 details you notice.',
          15, XP_C1),
        slot('c1_q3', 'Coffee', 'Un café d’un quartier non touristique',
          'Coffee in a non-touristy district',
          "Choisis un café dans un quartier non touristique (Goutte d'Or, Charonne, Tolbiac…) et bois-y un café de 20 min.",
          'Pick a café in a non-touristy district (Goutte d Or, Charonne, Tolbiac…) and have a 20-min coffee there.',
          "Si à distance : repère un café via un·e ami·e qui y vit.",
          'Remote: spot a café via a friend who lives there.',
          25, XP_C1),
      ]),
    ch('chapter_2', 'Paris des habitants', 'Parisians’ Paris',
      'Quatre quêtes pour entrer dans la vie locale.',
      'Four quests to enter local life.',
      [
        slot('c2_q1', 'ShoppingBasket', 'Marché de quartier',
          'Local market',
          "Va sur 1 marché parisien (Bastille, Aligre, Belleville…) cette semaine — achète 3 produits et discute avec 2 vendeur·euses.",
          'Hit 1 Parisian market this week (Bastille, Aligre, Belleville…) — buy 3 products and chat with 2 vendors.',
          "Distance : appelle un·e habitant·e et fais-toi raconter le marché.",
          'Remote: call a local and have them describe the market.',
          60, XP_C2),
        slot('c2_q2', 'Music', 'Concert dans un café',
          'Café concert',
          "Trouve un live gratuit ou pas cher dans un bar parisien cette semaine (Centre Quart, La Java, Le Pop-In…) — reste 30 min minimum.",
          'Find a free or cheap live in a Parisian bar this week (Centre Quart, La Java, Le Pop-In…) — stay 30 min minimum.',
          "Distance : repère 3 lieux pour la prochaine venue.",
          'Remote: scout 3 places for next visit.',
          90, XP_C2),
        slot('c2_q3', 'BookOpen', 'Lib indé',
          'Indie bookshop',
          "Entre dans une librairie indépendante (Comme un roman, L'Atelier, Atout livre…), reste 20 min, repars avec 1 livre conseillé par un·e libraire.",
          'Step into an indie bookshop (Comme un roman, L Atelier, Atout livre…), stay 20 min, leave with 1 book a librarian recommended.',
          "Distance : appelle/mail 1 librairie pour conseil de lecture.",
          'Remote: call/email 1 bookshop for a recommendation.',
          30, XP_C2),
        slot('c2_q4', 'TreesPalm', 'Un parc moins connu',
          'A lesser-known park',
          "Découvre un parc moins fréquenté (Buttes-Chaumont, Bercy, Belleville, Montsouris) — flâne 45 min, observe le quartier autour.",
          'Visit a less-busy park (Buttes-Chaumont, Bercy, Belleville, Montsouris) — wander 45 min, observe the area.',
          "Distance : choisis-en 1 sur carte, écris pourquoi tu y irais.",
          'Remote: pick one on the map, write why you would go.',
          45, XP_C2),
      ]),
    ch('chapter_3', 'Paris signature', 'Signature Paris',
      'Trois quêtes pour faire de Paris ton lieu.',
      'Three quests to make Paris yours.',
      [
        slot('c3_q1', 'Drama', 'Théâtre ou expo',
          'Theatre or exhibit',
          "Programme un théâtre/expo dans les 14 jours (musée moins fréquenté ou off) — choisis selon ton humeur, pas la hype.",
          'Plan a theatre/exhibit in 14 days (lesser-known museum or off) — pick by mood, not hype.',
          "Distance : prends 2 billets pour ta prochaine venue.",
          'Remote: book 2 tickets for next visit.',
          120, XP_C3),
        slot('c3_q2', 'Footprints', 'Quartier traversé à pied',
          'A district walked',
          "Choisis 1 quartier (le 13e, le 19e, Charonne…) et traverse-le entièrement à pied en 90 min — note 5 détails.",
          'Pick 1 district (13th, 19th, Charonne…) and walk through it entirely in 90 min — note 5 details.',
          "Distance : trace l’itinéraire sur carte, raconte ce que tu y verrais.",
          'Remote: trace the route on a map, write what you would see.',
          90, XP_C3),
        slot('c3_q3', 'Sparkles', 'Mon Paris à moi',
          'My own Paris',
          "Écris un mini-guide de ton Paris : 5 lieux que tu aimes vraiment, 1 phrase chacun. Garde-le ou envoie-le à un·e ami·e qui visite bientôt.",
          'Write a mini-guide of your Paris: 5 places you actually love, 1 line each. Keep it or send to a visiting friend.',
          "Si tu n’y as jamais été, écris ton « Paris rêvé » en 5 lieux.",
          'If never been, write your "dream Paris" in 5 places.',
          30, XP_C3),
      ]),
  ],
};

const ARC_LYON: QuestPackArc = {
  packId: 'pack_lyon',
  rewardTitleId: 'pack_lyon_master',
  rewardCoins: 180,
  chapters: [
    ch('chapter_1', 'Entre les fleuves', 'Between the rivers',
      'Trois quêtes pour saisir la géographie lyonnaise.',
      'Three quests to grasp Lyon geography.',
      [
        slot('c1_q1', 'Map', 'Saône puis Rhône',
          'Saône then Rhône',
          "Marche 30 min le long de la Saône puis 30 min le long du Rhône cette semaine — note ce qui change entre les deux.",
          'Walk 30 min along the Saône then 30 min along the Rhône this week — note what changes between them.',
          "Distance : sur carte, écris 3 différences ressenties.",
          'Remote: on the map, write 3 felt differences.',
          60, XP_C1),
        slot('c1_q2', 'Building', 'Une traboule',
          'A traboule',
          "Trouve 1 traboule lyonnaise et arpente-la calmement — note le silence, la pierre, le ciel entre les toits.",
          'Find 1 Lyon traboule and walk it calmly — note silence, stone, sky between roofs.',
          "Distance : choisis-en 1 sur photo, écris 3 détails sensoriels.",
          'Remote: pick one in pictures, write 3 sensory details.',
          15, XP_C1),
        slot('c1_q3', 'Coffee', 'Bouchon ou café croix-roussien',
          'Bouchon or Croix-Rousse café',
          "Mange dans un bouchon (ou prends un café à la Croix-Rousse) — discute avec le serveur·euse 5 min sur le quartier.",
          'Eat in a bouchon (or take a coffee in Croix-Rousse) — chat 5 min with the server about the area.',
          "Distance : appelle un·e ami·e lyonnais·e et fais-toi raconter.",
          'Remote: call a Lyon friend and have them tell you.',
          60, XP_C1),
      ]),
    ch('chapter_2', 'Lyon vivant', 'Lyon alive',
      'Quatre quêtes pour entrer dans le pli local.',
      'Four quests to step into local creases.',
      [
        slot('c2_q1', 'ShoppingBasket', 'Halles et marchés',
          'Halls and markets',
          "Va aux Halles Bocuse ou sur le marché Saint-Antoine — achète 3 produits et discute 2 conseils.",
          'Visit Halles Bocuse or Saint-Antoine market — buy 3 products and gather 2 tips.',
          "Distance : repère 3 producteurs en ligne, écris ce que tu prendrais.",
          'Remote: scout 3 online, write what you would buy.',
          60, XP_C2),
        slot('c2_q2', 'Wine', 'Cave de quartier',
          'Local wine shop',
          "Entre dans une cave indépendante, demande 1 conseil pour 1 plat, achète 1 bouteille — discute 5 min.",
          'Step into an indie wine shop, ask 1 pairing for 1 dish, buy 1 bottle — chat 5 min.',
          "Distance : passe 1 appel à 1 cave et fais-toi conseiller.",
          'Remote: call 1 cellar for advice.',
          20, XP_C2),
        slot('c2_q3', 'Footprints', 'Pentes de la Croix-Rousse',
          'Croix-Rousse slopes',
          "Monte les pentes de la Croix-Rousse à pied — observe les murs peints, les boutiques, les ateliers.",
          'Walk up the Croix-Rousse slopes — watch painted walls, shops, workshops.',
          "Distance : itinéraire sur carte + 5 détails attendus.",
          'Remote: map route + 5 expected details.',
          45, XP_C2),
        slot('c2_q4', 'Sparkles', 'Fresque ou mur peint',
          'Mural or painted wall',
          "Trouve 1 fresque lyonnaise (Mur des Canuts, Cour des Loges, Bibliothèque…) et passe 15 min à la regarder.",
          'Find 1 Lyon mural (Mur des Canuts, Cour des Loges, Bibliothèque…) and watch it 15 min.',
          "Distance : 1 fresque sur photo, écris ce qu’elle raconte.",
          'Remote: 1 in pictures, write what it tells.',
          15, XP_C2),
      ]),
    ch('chapter_3', 'Lyon signature', 'Signature Lyon',
      'Trois quêtes pour faire de Lyon ton lieu.',
      'Three quests to make Lyon yours.',
      [
        slot('c3_q1', 'TramFront', 'Funi puis colline',
          'Funicular then hill',
          "Prends le funi de Fourvière, monte à la colline, redescends à pied par les jardins du Rosaire — pause 10 min sur le belvédère.",
          'Take Fourvière funicular up, walk down via Rosaire gardens — 10 min pause on the lookout.',
          "Distance : trace l’itinéraire et écris la vue imaginée.",
          'Remote: trace it on the map, write the imagined view.',
          75, XP_C3),
        slot('c3_q2', 'Music', 'Concert ou opéra',
          'Concert or opera',
          "Programme dans les 14 jours un concert dans une salle lyonnaise (Ninkasi, Kao, Opéra) — pas le plus connu.",
          'Plan a concert in 14 days in a Lyon venue (Ninkasi, Kao, Opera) — not the most famous.',
          "Distance : repère 3 dates pour ta prochaine venue.",
          'Remote: scout 3 dates for next visit.',
          120, XP_C3),
        slot('c3_q3', 'BookHeart', 'Mon Lyon à moi',
          'My own Lyon',
          "Écris un mini-guide de ton Lyon — 5 lieux, 1 phrase. Envoie-le à un·e ami·e qui visite bientôt.",
          'Write a mini-guide of your Lyon — 5 places, 1 line. Send it to a friend visiting soon.',
          "Si jamais venu, écris ton « Lyon rêvé ».",
          'If never been, write your "dream Lyon".',
          30, XP_C3),
      ]),
  ],
};

const ARC_NANTES: QuestPackArc = {
  packId: 'pack_nantes',
  rewardTitleId: 'pack_nantes_master',
  rewardCoins: 180,
  chapters: [
    ch('chapter_1', 'Île à Loire', 'Island to Loire',
      'Trois quêtes pour entrer dans la géographie nantaise.',
      'Three quests to step into Nantes geography.',
      [
        slot('c1_q1', 'Footprints', 'Île de Nantes à pied',
          'Île de Nantes on foot',
          "Marche 45 min sur l'île de Nantes — éléphant, anneaux, hangars — observe ce qui change.",
          'Walk 45 min on Île de Nantes — elephant, rings, hangars — note shifts.',
          "Distance : trace l’itinéraire et écris 3 détails.",
          'Remote: trace it, write 3 details.',
          45, XP_C1),
        slot('c1_q2', 'Coffee', 'Café Bouffay',
          'Bouffay coffee',
          "Choisis un café dans le quartier Bouffay et bois-y un café 20 min en observant la rue.",
          'Pick a café in Bouffay and have a 20-min coffee while watching the street.',
          "Distance : repère 1 café via Maps, écris pourquoi.",
          'Remote: spot one on Maps, write why.',
          25, XP_C1),
        slot('c1_q3', 'Boat', 'Pause Erdre',
          'Erdre pause',
          "Va te poser 30 min au bord de l'Erdre (parc, ponton, banc) — sans téléphone.",
          'Sit 30 min by the Erdre (park, dock, bench) — phone away.',
          "Distance : 1 photo de l’Erdre + 3 mots qu’elle évoque.",
          'Remote: 1 photo of Erdre + 3 words it evokes.',
          30, XP_C1),
      ]),
    ch('chapter_2', 'Nantes en mouvement', 'Nantes moving',
      'Quatre quêtes pour goûter la ville en action.',
      'Four quests to taste the moving city.',
      [
        slot('c2_q1', 'Music', 'Live nantais',
          'Nantes live',
          "Trouve un concert dans un lieu nantais cette semaine (Stéréolux, Olympic, Lieu Unique) — reste 1 set.",
          'Find a gig in a Nantes venue this week (Stéréolux, Olympic, Lieu Unique) — stay 1 set.',
          "Distance : repère 3 dates.",
          'Remote: scout 3 dates.',
          90, XP_C2),
        slot('c2_q2', 'ShoppingBasket', 'Marché de Talensac',
          'Talensac market',
          "Va au marché de Talensac, achète 3 produits, discute 2 conseils.",
          'Visit Talensac market, buy 3 products, gather 2 tips.',
          "Distance : appelle un·e nantais·e pour conseils.",
          'Remote: call a Nantes friend for tips.',
          60, XP_C2),
        slot('c2_q3', 'Building', 'Lieu Unique',
          'Lieu Unique',
          "Passe 1h au Lieu Unique — café, expo, lecture, brocante — note 3 choses qui t'ont surpris·e.",
          'Spend 1h at Lieu Unique — café, exhibit, reading, flea market — note 3 surprises.',
          "Distance : repère 1 expo en cours et écris pourquoi tu irais.",
          'Remote: spot 1 ongoing show and write why.',
          60, XP_C2),
        slot('c2_q4', 'Sparkles', 'Voyage à Nantes',
          'Voyage à Nantes',
          "Suis 30 min de la ligne verte au sol (en partie) — note les œuvres croisées.",
          'Follow 30 min of the green ground line (partly) — note artworks crossed.',
          "Distance : carte + 5 œuvres remarquables que tu visiterais.",
          'Remote: map + 5 notable works you would visit.',
          30, XP_C2),
      ]),
    ch('chapter_3', 'Nantes signature', 'Signature Nantes',
      'Trois quêtes pour faire de Nantes ton lieu.',
      'Three quests to make Nantes yours.',
      [
        slot('c3_q1', 'Footprints', 'Trentemoult',
          'Trentemoult',
          "Bac jusqu'à Trentemoult, balade 60 min, observe les façades colorées et les ruelles.",
          'Ferry to Trentemoult, 60-min walk, watch colored facades and lanes.',
          "Distance : 5 photos + 5 mots.",
          'Remote: 5 photos + 5 words.',
          90, XP_C3),
        slot('c3_q2', 'Drama', 'Cinéma indé',
          'Indie cinema',
          "Va au Katorza ou au Concorde voir un film en VO — choisis selon ton humeur, pas la hype.",
          'Hit Katorza or Concorde for a VO film — pick by mood, not hype.',
          "Distance : choisis 1 séance, garde le billet.",
          'Remote: pick a session, keep the ticket.',
          120, XP_C3),
        slot('c3_q3', 'BookHeart', 'Mon Nantes à moi',
          'My own Nantes',
          "Écris un mini-guide de ton Nantes — 5 lieux, 1 phrase. À envoyer à un·e ami·e.",
          'Write a mini-guide of your Nantes — 5 places, 1 line. Send to a friend.',
          "Si jamais venu, écris ton « Nantes rêvé ».",
          'If never been, write your "dream Nantes".',
          30, XP_C3),
      ]),
  ],
};

const ARC_MARSEILLE: QuestPackArc = {
  packId: 'pack_marseille',
  rewardTitleId: 'pack_marseille_master',
  rewardCoins: 180,
  chapters: [
    ch('chapter_1', 'Vieux-Port et Panier', 'Vieux-Port and Panier',
      'Trois quêtes pour s’ancrer côté mer.',
      'Three quests to ground at the sea.',
      [
        slot('c1_q1', 'Anchor', 'Tour du Vieux-Port',
          'Vieux-Port loop',
          "Marche 45 min autour du Vieux-Port — note 5 odeurs ou sons spécifiques à la mer.",
          'Walk 45 min around Vieux-Port — note 5 sea-specific smells or sounds.',
          "Distance : 1 photo + 5 mots qu’elle évoque.",
          'Remote: 1 photo + 5 words it evokes.',
          45, XP_C1),
        slot('c1_q2', 'Building', 'Ruelles du Panier',
          'Panier alleys',
          "Perds-toi 30 min dans le Panier — note 3 détails (faïence, escalier, murs peints).",
          'Get lost 30 min in Le Panier — note 3 details (tiles, steps, painted walls).',
          "Distance : choisis 1 ruelle sur photo, écris ce que tu y verrais.",
          'Remote: pick one on photo, write what you would see.',
          30, XP_C1),
        slot('c1_q3', 'Coffee', 'Pastis ou café à Noailles',
          'Pastis or coffee in Noailles',
          "Boisson dans un bar/café de Noailles — 20 min calme, observation de la rue.",
          'Drink in a bar/café in Noailles — 20 quiet minutes, watch the street.',
          "Distance : repère 1 lieu et raconte la rue.",
          'Remote: spot 1 place and describe the street.',
          25, XP_C1),
      ]),
    ch('chapter_2', 'Calanques et hauts', 'Calanques and heights',
      'Quatre quêtes pour bouger.',
      'Four quests to move.',
      [
        slot('c2_q1', 'Mountain', 'Marche aux calanques',
          'Calanques walk',
          "Programme une marche aux calanques (Sormiou, Morgiou, Sugiton…) cette semaine — minimum 90 min.",
          'Plan a calanques walk (Sormiou, Morgiou, Sugiton…) this week — at least 90 min.',
          "Eau, chaussures fermées, écran solaire.",
          'Water, closed shoes, sunscreen.',
          150, XP_C2,
          "Vérifie l’accès (interdiction estivale possible) et météo.",
          'Check access (summer closures) and weather.'),
        slot('c2_q2', 'Footprints', 'Corniche Kennedy',
          'Corniche Kennedy',
          "Marche 60 min sur la corniche Kennedy — observe la mer, les bateaux, le vent.",
          'Walk 60 min on the Corniche Kennedy — watch sea, boats, wind.',
          "Distance : photo + 5 mots qu’elle évoque.",
          'Remote: photo + 5 words it evokes.',
          60, XP_C2),
        slot('c2_q3', 'ShoppingBasket', 'Marché de Noailles',
          'Noailles market',
          "Va au marché de Noailles — achète 3 produits, discute 2 conseils, note 1 mot pour chacun.",
          'Visit Noailles market — buy 3 products, gather 2 tips, write 1 word for each.',
          "Distance : appelle un·e marseillais·e pour conseils.",
          'Remote: call a Marseille friend for tips.',
          60, XP_C2),
        slot('c2_q4', 'Sparkles', 'Coucher de soleil au Pharo',
          'Sunset at Pharo',
          "Programme un coucher de soleil au Pharo, à la digue ou à la corniche — reste 30 min après le soleil couché.",
          'Plan a sunset at Pharo, at the dyke or corniche — stay 30 min past sundown.',
          "Distance : prends 1 photo de coucher de soleil et regarde-la 1 min en silence.",
          'Remote: snap a sunset photo and look at it 1 min in silence.',
          60, XP_C2),
      ]),
    ch('chapter_3', 'Marseille signature', 'Signature Marseille',
      'Trois quêtes pour faire de Marseille ton lieu.',
      'Three quests to make Marseille yours.',
      [
        slot('c3_q1', 'Boat', 'Bateau pour les îles',
          'Boat to the islands',
          "Programme un aller-retour Frioul ou If d'ici 14 jours — minimum 2h sur l'île.",
          'Plan a Frioul or If round-trip in 14 days — at least 2h on the island.',
          "Distance : repère 1 horaire pour ta prochaine venue.",
          'Remote: scout 1 schedule for next visit.',
          240, XP_C3),
        slot('c3_q2', 'Music', 'Live à la friche',
          'Live at La Friche',
          "Trouve un concert ou évènement à la Friche La Belle de Mai cette semaine.",
          'Find a gig or event at Friche La Belle de Mai this week.',
          "Distance : repère 3 dates.",
          'Remote: scout 3 dates.',
          120, XP_C3),
        slot('c3_q3', 'BookHeart', 'Mon Marseille à moi',
          'My own Marseille',
          "Écris un mini-guide de ton Marseille — 5 lieux, 1 phrase. À envoyer à un·e ami·e.",
          'Write a mini-guide of your Marseille — 5 places, 1 line. Send to a friend.',
          "Si jamais venu, écris ton « Marseille rêvé ».",
          'If never been, write your "dream Marseille".',
          30, XP_C3),
      ]),
  ],
};

/* ─── Registry ────────────────────────────────────────────────────────────── */

export const QUEST_PACK_ARCS: Record<string, QuestPackArc> = {
  pack_couple: ARC_COUPLE,
  pack_ose: ARC_OSE,
  pack_rencontres: ARC_RENCONTRES,
  pack_nocturne: ARC_NOCTURNE,
  pack_piment: ARC_PIMENT,
  pack_solo_absolu: ARC_SOLO_ABSOLU,
  pack_gastronomie: ARC_GASTRONOMIE,
  pack_slow_life: ARC_SLOW_LIFE,
  pack_social_amis: ARC_SOCIAL_AMIS,
  pack_paris: ARC_PARIS,
  pack_lyon: ARC_LYON,
  pack_nantes: ARC_NANTES,
  pack_marseille: ARC_MARSEILLE,
};

export function getQuestPackArc(packId: string): QuestPackArc | undefined {
  return QUEST_PACK_ARCS[packId];
}

export function listAllQuestPackArcSlugs(packId: string): string[] {
  const arc = QUEST_PACK_ARCS[packId];
  if (!arc) return [];
  return arc.chapters.flatMap((c) => c.slots.map((s) => `${c.id}.${s.slug}`));
}

export function findQuestPackArcSlot(
  packId: string,
  slotKey: string,
): { chapter: QuestPackArcChapter; slot: QuestPackArcSlot } | undefined {
  const arc = QUEST_PACK_ARCS[packId];
  if (!arc) return undefined;
  const [chapterId, slug] = slotKey.split('.');
  if (!chapterId || !slug) return undefined;
  const chapter = arc.chapters.find((c) => c.id === chapterId);
  if (!chapter) return undefined;
  const slot = chapter.slots.find((s) => s.slug === slug);
  if (!slot) return undefined;
  return { chapter, slot };
}

/* ─── Progression : helpers purs ─────────────────────────────────────────── */

export interface QuestPackProgressEntry {
  /** Liste des slot keys complétés (forme `chapter_X.slug`). */
  completed: string[];
  /** True quand le bonus final (titre + QC) a été versé. */
  rewardClaimed?: boolean;
}

export type QuestPackProgressMap = Record<string, QuestPackProgressEntry>;

/** Parse défensif d'un JSON `questPackProgress` venu de la DB. */
export function parseQuestPackProgress(raw: unknown): QuestPackProgressMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: QuestPackProgressMap = {};
  for (const [packId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const v = val as { completed?: unknown; rewardClaimed?: unknown };
    const completed = Array.isArray(v.completed)
      ? v.completed.filter((x): x is string => typeof x === 'string')
      : [];
    out[packId] = {
      completed,
      ...(v.rewardClaimed === true ? { rewardClaimed: true } : {}),
    };
  }
  return out;
}

/** Vrai si toutes les quêtes du chapitre `chapterId` du pack sont complétées. */
export function isChapterCompleted(
  arc: QuestPackArc,
  chapterId: PackArcChapterId,
  completed: string[],
): boolean {
  const chapter = arc.chapters.find((c) => c.id === chapterId);
  if (!chapter) return false;
  return chapter.slots.every((s) => completed.includes(`${chapter.id}.${s.slug}`));
}

/** Le chapitre `chapterId` est-il jouable (le précédent est complété ou il est ch1) ? */
export function isChapterUnlocked(
  arc: QuestPackArc,
  chapterId: PackArcChapterId,
  completed: string[],
): boolean {
  const idx = arc.chapters.findIndex((c) => c.id === chapterId);
  if (idx <= 0) return idx === 0;
  const prev = arc.chapters[idx - 1];
  return prev.slots.every((s) => completed.includes(`${prev.id}.${s.slug}`));
}

export interface ArcStateSlotView {
  slug: string;
  key: string;
  status: 'completed' | 'available' | 'locked';
  icon: string;
  title: { fr: string; en: string };
  durationMinutes: number;
  xp: number;
}

export interface ArcStateChapterView {
  id: PackArcChapterId;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  status: 'completed' | 'in_progress' | 'locked';
  slots: ArcStateSlotView[];
}

export interface ArcStateView {
  packId: string;
  totalSlots: number;
  completedCount: number;
  completedSlugs: string[];
  rewardClaimed: boolean;
  rewardTitleId: string;
  rewardCoins: number;
  chapters: ArcStateChapterView[];
}

/** Construit la vue UI de l'arc à partir de l'arc et de la progression. */
export function buildArcState(
  arc: QuestPackArc,
  progress: QuestPackProgressEntry | undefined,
): ArcStateView {
  const completed = progress?.completed ?? [];
  const totalSlots = arc.chapters.reduce((acc, c) => acc + c.slots.length, 0);
  const chapters: ArcStateChapterView[] = arc.chapters.map((c) => {
    const unlocked = isChapterUnlocked(arc, c.id, completed);
    const completedSlots = c.slots.filter((s) =>
      completed.includes(`${c.id}.${s.slug}`),
    );
    const status: ArcStateChapterView['status'] = !unlocked
      ? 'locked'
      : completedSlots.length === c.slots.length
        ? 'completed'
        : 'in_progress';
    const slots: ArcStateSlotView[] = c.slots.map((s) => {
      const key = `${c.id}.${s.slug}`;
      const isCompleted = completed.includes(key);
      return {
        slug: s.slug,
        key,
        status: isCompleted
          ? ('completed' as const)
          : unlocked
            ? ('available' as const)
            : ('locked' as const),
        icon: s.icon,
        title: s.title,
        durationMinutes: s.durationMinutes,
        xp: s.xp,
      };
    });
    return { id: c.id, title: c.title, description: c.description, status, slots };
  });
  return {
    packId: arc.packId,
    totalSlots,
    completedCount: completed.length,
    completedSlugs: completed,
    rewardClaimed: progress?.rewardClaimed === true,
    rewardTitleId: arc.rewardTitleId,
    rewardCoins: arc.rewardCoins,
    chapters,
  };
}

/** Vrai quand toutes les quêtes des 3 chapitres sont complétées. */
export function isArcFullyCompleted(arc: QuestPackArc, completed: string[]): boolean {
  return arc.chapters.every((c) => isChapterCompleted(arc, c.id, completed));
}
