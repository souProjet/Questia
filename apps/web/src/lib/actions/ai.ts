'use server';

import OpenAI from 'openai';
import type { QuestNarrationRequest, QuestNarrationResponse } from '@dopamode/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

export async function generateQuestNarration(
  request: QuestNarrationRequest,
): Promise<QuestNarrationResponse> {
  const { anonymizedProfile, questModel } = request;

  const systemPrompt = `Tu es le Maître des Quêtes, un narrateur épique et bienveillant qui transforme le quotidien en aventure. Tu t'adresses directement à l'aventurier en le tutoyant. Ton ton est motivant, légèrement mystérieux, et toujours respectueux. Tu ne révèles jamais le profil psychologique de l'utilisateur. Tu génères des narrations courtes (3-5 phrases max) et percutantes.`;

  const userPrompt = `Génère une narration personnalisée pour cette quête secondaire.

Contexte (anonymisé) :
- Phase du parcours : ${anonymizedProfile.phase}
- Jour n°${anonymizedProfile.dayNumber}
- Niveau de congruence : ${anonymizedProfile.congruenceDelta.toFixed(2)}

Quête assignée :
- Titre : ${questModel.title}
- Description : ${questModel.description}
- Catégorie : ${questModel.category}
- Niveau de sortie de zone de confort : ${questModel.comfortLevel}

Réponds en JSON avec cette structure exacte :
{
  "title": "titre épique personnalisé",
  "narrative": "narration immersive en 3-5 phrases",
  "motivationalHook": "phrase d'accroche motivante courte",
  "estimatedDuration": "durée estimée en texte",
  "safetyReminders": ["rappel sécurité 1", "rappel sécurité 2"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    return JSON.parse(content) as QuestNarrationResponse;
  } catch {
    return {
      title: questModel.title,
      narrative: questModel.description,
      motivationalHook: 'Chaque quête est une chance de se redécouvrir.',
      estimatedDuration: `${questModel.minimumDurationMinutes} minutes`,
      safetyReminders: [
        'Reste toujours dans des zones sûres et éclairées.',
        'Fais confiance à ton instinct — si quelque chose semble risqué, passe ton chemin.',
      ],
    };
  }
}
