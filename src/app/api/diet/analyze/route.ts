import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = buffer.toString('base64');
    const mediaType = (imageFile.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: 'Analyze this food photo. Identify all food items, estimate portions, and calculate protein content. Return JSON only (no markdown): {"name": string, "protein_grams": number, "calories": number, "items": [{"name": string, "portion": string, "protein_grams": number}]}',
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({ name: 'Food item', protein_grams: 0, calories: 0, items: [] });
    }
  } catch (err) {
    console.error('Diet analyze error:', err);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
