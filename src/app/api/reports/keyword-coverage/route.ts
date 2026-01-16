export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(DISTINCT k.id) as total
      FROM keywords k
      JOIN keyword_rankings kr ON k.id = kr.keyword_id;
    `);
    const total = Number(countResult.rows[0]?.total || 0);

    // Get paginated keywords
    const result = await db.execute(sql`
        SELECT 
            k.id, 
            k.keyword_text, 
            COUNT(DISTINCT kr.domain_id) as domain_count, 
            MAX(kr.search_volume) as volume
        FROM keywords k
        JOIN keyword_rankings kr ON k.id = kr.keyword_id
        GROUP BY k.id, k.keyword_text
        ORDER BY domain_count DESC, volume DESC
        LIMIT ${limit} OFFSET ${offset};
    `);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

