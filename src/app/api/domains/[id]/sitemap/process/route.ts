
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipeUrls, domains, importLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const domainId = parseInt(params.id);
    const { urls } = await request.json(); // Expecting array of { loc, lastmod }

    if (!urls || !Array.isArray(urls)) {
        return NextResponse.json({ error: 'Valid URLs array is required' }, { status: 400 });
    }

    // Prepare all valid URL records first
    const urlRecords: { 
        domainId: number; 
        url: string; 
        slug: string; 
        lastModified: Date; 
        source: string; 
    }[] = [];

    for (const entry of urls) {
        try {
            const urlObj = new URL(entry.loc);
            const path = urlObj.pathname;
            const slug = path.replace(/^\/|\/$/g, ''); // Trim slashes

            if (!slug) continue; // Skip homepages or empty

            urlRecords.push({
                domainId,
                url: entry.loc,
                slug: slug,
                lastModified: entry.lastmod ? new Date(entry.lastmod) : new Date(),
                source: 'sitemap'
            });
        } catch (err) {
            console.error(`Invalid URL ${entry.loc}`, err);
        }
    }

    let addedCount = 0;

    // Batch insert in chunks of 100 for optimal performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < urlRecords.length; i += BATCH_SIZE) {
        const batch = urlRecords.slice(i, i + BATCH_SIZE);
        try {
            await db.insert(recipeUrls)
                .values(batch)
                .onConflictDoUpdate({
                    target: recipeUrls.url,
                    set: { 
                        lastModified: sql`EXCLUDED.last_modified`,
                        updatedAt: new Date()
                    }
                });
            addedCount += batch.length;
        } catch (err) {
            console.error(`Batch insert failed at index ${i}`, err);
        }
    }

    // Update domain timestamp and total URLs
    const countResult = await db.execute(sql`SELECT count(*) FROM ${recipeUrls} WHERE ${recipeUrls.domainId} = ${domainId}`);
    const totalCount = parseInt(countResult.rows[0].count as string);

    await db.update(domains)
       .set({ 
           lastSitemapImport: new Date(),
           totalRecipeUrls: totalCount
       })
       .where(eq(domains.id, domainId));

    // Log import
    await db.insert(importLogs).values({
        domainId,
        importType: 'sitemap',
        rowsImported: addedCount,
        warnings: urls.length - addedCount > 0 ? [{ message: 'Some URLs skipped or updated' }] : null
    });

    return NextResponse.json({ success: true, added: addedCount });
  } catch (error: any) {
    console.error('Sitemap process error:', error);
    return NextResponse.json({ error: 'Failed to process URLs' }, { status: 500 });
  }
}
