import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const domainId = parseInt(params.id);

    // Get all keywords for this domain with their rankings
    const keywords = await db.execute(sql`
      SELECT 
        k.id,
        k.keyword_text,
        kr.position,
        kr.search_volume,
        kr.pinterest_pin_url,
        r.url as recipe_url
      FROM keyword_rankings kr
      JOIN keywords k ON kr.keyword_id = k.id
      LEFT JOIN recipe_urls r ON kr.recipe_url_id = r.id
      WHERE kr.domain_id = ${domainId}
      ORDER BY kr.search_volume DESC NULLS LAST;
    `);

    // Get pin URL analysis - group by pinterest_pin_url to show keyword counts per pin
    const pinAnalysis = await db.execute(sql`
      SELECT 
        kr.pinterest_pin_url,
        COUNT(*) as keyword_count,
        SUM(COALESCE(kr.search_volume, 0)) as total_volume,
        r.url as recipe_url
      FROM keyword_rankings kr
      LEFT JOIN recipe_urls r ON kr.recipe_url_id = r.id
      WHERE kr.domain_id = ${domainId} AND kr.pinterest_pin_url IS NOT NULL
      GROUP BY kr.pinterest_pin_url, r.url
      ORDER BY keyword_count DESC;
    `);

    // Get total stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_keywords,
        SUM(COALESCE(search_volume, 0)) as total_volume
      FROM keyword_rankings
      WHERE domain_id = ${domainId};
    `);

    return NextResponse.json({
      keywords: keywords.rows,
      pinAnalysis: pinAnalysis.rows,
      stats: stats.rows[0] || { total_keywords: 0, total_volume: 0 }
    });
  } catch (error) {
    console.error('Keyword analysis error:', error);
    return NextResponse.json({ error: 'Failed to fetch keyword analysis' }, { status: 500 });
  }
}
