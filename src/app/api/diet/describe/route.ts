import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: 'No description provided' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Estimate the protein content of this meal based on the description. Be practical and realistic with portion sizes if not specified.

Description: "${description}"

Return JSON only (no markdown): {"name": string, "protein_grams": number, "calories": number, "items": [{"name": string, "portion": string, "protein_grams": number}]}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({ name: description, protein_grams: 0, calories: 0, items: [] });
    }
  } catch (err) {
    console.error('Diet describe error:', err);
    return NextResponse.json({ error: 'Failed to estimate protein' }, { status: 500 });
  }
}
