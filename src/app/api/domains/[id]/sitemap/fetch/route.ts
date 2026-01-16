export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { SitemapParser } from '@/lib/sitemap-parser';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { url } = await request.json();
    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parser = new SitemapParser();
    const result = await parser.fetchAndParse(url);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Sitemap fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse sitemap' }, { status: 500 });
  }
}

