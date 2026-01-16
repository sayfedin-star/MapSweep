export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { domains } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await db.delete(domains).where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete domain:', error);
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
  }
}

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
  ) {
    const params = await props.params;
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
          return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
  
      const domain = await db.query.domains.findFirst({
        where: eq(domains.id, id)
      });

      if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
      }
  
      return NextResponse.json(domain);
    } catch (error) {
      console.error('Failed to fetch domain:', error);
      return NextResponse.json({ error: 'Failed to fetch domain' }, { status: 500 });
    }
  }

