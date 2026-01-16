
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipeUrls, domains, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { STOP_WORDS } from '@/lib/constants';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const domainId = parseInt(params.id);
    const domain = await db.query.domains.findFirst({
        where: eq(domains.id, domainId)
    });

    if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Fetch global stop words settings from database
    const globalSettings = await db.select().from(settings).where(eq(settings.key, 'stop_words'));
    let stopWordsSet: Set<string>;
    
    if (globalSettings.length > 0 && globalSettings[0].value) {
      const settingsValue = globalSettings[0].value as { stopWords?: string[], customWords?: string[] };
      const defaultWords = settingsValue.stopWords || Array.from(STOP_WORDS);
      const customWords = settingsValue.customWords || [];
      stopWordsSet = new Set([...defaultWords, ...customWords]);
    } else {
      stopWordsSet = STOP_WORDS;
    }

    // Fetch all slugs with full URLs
    const urlData = await db.select({ slug: recipeUrls.slug, url: recipeUrls.url }).from(recipeUrls).where(eq(recipeUrls.domainId, domainId));

    const wordCounts: Record<string, number> = {};
    const wordUrls: Record<string, string[]> = {};

    urlData.forEach((entry) => {
        if (!entry.slug) return;
        
        // Tokenize
        const tokens = entry.slug
            .toLowerCase()
            .replace(/-/g, ' ') // Replace hyphens with space
            .replace(/[^\w\s]/g, '') // Remove special chars
            .split(/\s+/);
        
        tokens.forEach(token => {
            // Filter
            if (token.length < 2) return; // Skip single letters
            if (!isNaN(Number(token))) return; // Skip pure numbers
            if (stopWordsSet.has(token)) return; // Skip stop words

            wordCounts[token] = (wordCounts[token] || 0) + 1;
            if (!wordUrls[token]) wordUrls[token] = [];
            if (!wordUrls[token].includes(entry.url)) {
                wordUrls[token].push(entry.url);
            }
        });
    });

    // Convert to array and sort
    const analysis = Object.entries(wordCounts)
        .map(([word, count]) => ({ 
            word, 
            count, 
            urls: wordUrls[word] || []
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);

    // Also return all URLs for copy feature
    const allUrls = urlData.map(u => u.url);

    return NextResponse.json({
        domainName: domain.domainName,
        totalUrls: urlData.length,
        allUrls,
        analysis
    });

  } catch (error) {
    console.error('Slug analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze slugs' }, { status: 500 });
  }
}
