export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const STOP_WORDS_KEY = 'stop_words';

export async function GET() {
  try {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, STOP_WORDS_KEY)
    });

    if (setting && setting.value) {
      return NextResponse.json(setting.value);
    }

    // Return empty/defaults if not set
    return NextResponse.json({ stopWords: null, customWords: [] });
  } catch (error) {
    console.error('Failed to fetch stop words settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stopWords, customWords } = body;

    // Upsert the settings
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, STOP_WORDS_KEY)
    });

    if (existing) {
      await db.update(settings)
        .set({ 
          value: { stopWords, customWords },
          updatedAt: new Date()
        })
        .where(eq(settings.key, STOP_WORDS_KEY));
    } else {
      await db.insert(settings).values({
        key: STOP_WORDS_KEY,
        value: { stopWords, customWords }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save stop words settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

