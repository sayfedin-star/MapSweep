
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { keywordRankings, domains, recipeUrls } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const keywordId = parseInt(params.id);
    
    const rankings = await db.select({
        domainName: domains.domainName,
        position: keywordRankings.position,
        url: recipeUrls.url,
        pinterestPinUrl: keywordRankings.pinterestPinUrl,
        pinImageUrl: keywordRankings.pinImageUrl
    })
    .from(keywordRankings)
    .innerJoin(domains, eq(keywordRankings.domainId, domains.id))
    .leftJoin(recipeUrls, eq(keywordRankings.recipeUrlId, recipeUrls.id)) // Join recipe url
    .where(eq(keywordRankings.keywordId, keywordId))
    .orderBy(keywordRankings.position);

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Rankings detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
