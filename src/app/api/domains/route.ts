export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { domains } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allDomains = await db.query.domains.findMany({
      orderBy: [desc(domains.createdAt)],
    });
    return NextResponse.json(allDomains);
  } catch (error) {
    console.error('Failed to fetch domains:', error);
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domainName, pinclicksAccountUrl } = body;

    if (!domainName) {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
    }

    // Basic validation/sanitization (remove http://, etc) in frontend, but good to ensure here
    const cleanDomain = domainName.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const newDomain = await db.insert(domains).values({
      domainName: cleanDomain,
      pinclicksAccountUrl,
      // Default values
      monthlyViews: 0,
      totalKeywords: 0,
    }).returning();

    return NextResponse.json(newDomain[0], { status: 201 });
  } catch (error: any) {
    console.error('Failed to create domain:', error);
    if (error.code === '23505') { // Postgres duplicate key error code
        return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
  }
}

