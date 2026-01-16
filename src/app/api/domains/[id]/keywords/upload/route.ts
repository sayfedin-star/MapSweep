export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, keywords, keywordRankings, recipeUrls, importLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import Papa from 'papaparse';

// Helper to normalize URLs for matching
function normalizeUrl(url: string) {
    if (!url) return '';
    return url.replace(/^https?:\/\/(www\.)?/, 'https://').replace(/\/$/, '');
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const domainId = parseInt(params.id);
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const { data, errors, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    // Headers check: Keyword, Position, Link, Pin (Pinclicks format)
    const requiredCols = ['Keyword', 'Position', 'Link', 'Pin'];
    const headers = meta.fields || [];
    const missing = requiredCols.filter(c => !headers.includes(c));
    
    if (missing.length > 0) {
        return NextResponse.json({ error: `Missing columns: ${missing.join(', ')}` }, { status: 400 });
    }

    // Transaction: Delete old rankings -> Insert new
    // Drizzle doesn't support complex transactions in `serverless` driver easily without `transaction()` block, 
    // but Neon driver supports it. Let's try to be safe.
    
    const importDate = new Date();
    const warningList: string[] = [];
    let addedKeywords = 0;
    
    // 1. Clear old rankings for this domain
    await db.delete(keywordRankings).where(eq(keywordRankings.domainId, domainId));

    // 2. Process rows
    for (const row of data as any[]) {
        if (!row.Keyword || !row.Link) continue; // Skip bad rows

        // 2a. Get or Create Keyword
        // Upsert isn't fully standard in Drizzle/PG simple insert, we can use `onConflictDoUpdate` or check.
        // For bulk, let's try insert and ignore conflict, then select. 
        // Or just select first. Caching might be needed for speed, but let's do simple first.
        let keywordId: number;
        
        // This is N+1, optimize later if needed (bulk insert keywords first)
        const existingKw = await db.query.keywords.findFirst({
            where: eq(keywords.keywordText, row.Keyword)
        });

        if (existingKw) {
            keywordId = existingKw.id;
        } else {
            const newKw = await db.insert(keywords).values({ keywordText: row.Keyword }).returning();
            keywordId = newKw[0].id;
        }

        // 2b. Match or Create Recipe URL
        let recipeId: number | null = null;
        const normalizedCsvLink = normalizeUrl(row.Link);
        
        // Try strict match first, then normalized?
        // Let's rely on database having normalized URLs? No, we likely stored raw sitemap URLs.
        // We need a robust match. 
        // Strategy: Try exact match first. If not found, create new.
        // Note: normalizedUrl helper above forces https and removes valid trailing slash.
        
        const existingRecipe = await db.query.recipeUrls.findFirst({
            where: eq(recipeUrls.url, row.Link) // Try exact string from CSV
        });

        if (existingRecipe) {
            recipeId = existingRecipe.id;
        } else {
            // Check normalized match? (Optional optimization)
            // If not found, CREATE IT (Permissive mode)
            try {
                // Determine source slug 
                const urlObj = new URL(row.Link);
                const slug = urlObj.pathname.replace(/^\/|\/$/g, '');

                const newRecipe = await db.insert(recipeUrls).values({
                    domainId,
                    url: row.Link,
                    slug: slug || 'home',
                    source: 'csv_import',
                    lastModified: importDate
                }).returning();
                recipeId = newRecipe[0].id;
                warningList.push(`Created missing URL: ${row.Link}`);
            } catch (e) {
                console.error('Failed to create recipe URL from CSV', row.Link, e);
                // Maybe it failed because unique constraint on slug? Or URL? 
                // If URL already exists (conflict), we should have found it. 
                // Skip if duplicate error (race condition).
                continue;
            }
        }

        // 2c. Insert Ranking
        if (keywordId) {
             await db.insert(keywordRankings).values({
                 domainId,
                 keywordId,
                 recipeUrlId: recipeId,
                 position: parseInt(row.Position) || 0,
                 positionChange: row.Change ? parseInt(row.Change) : null,
                 searchVolume: row.Volume ? parseInt(row.Volume) : 0,
                 pinterestPinUrl: row.Pin,
                 trackedDate: importDate.toISOString().split('T')[0],
             });
             addedKeywords++;
        }
    }

    // 3. Update domain stats
    await db.update(domains)
        .set({ 
            lastKeywordsImport: new Date(),
            totalKeywords: addedKeywords 
            // We could update monthlyViews if CSV has it, but Pinclicks CSV usually doesn't have domain total?
            // "Volume" is search volume. "Monthly Views" is usually a domain-level metric from Pinclicks UI, not CSV row.
        })
        .where(eq(domains.id, domainId));

    // 4. Log
    const warningObj = warningList.length > 0 ? warningList.slice(0, 50).map(w => ({ message: w })) : null;
    await db.insert(importLogs).values({
        domainId,
        importType: 'keywords',
        rowsImported: addedKeywords,
        fileName: file.name,
        warnings: warningObj as any, // Drizzle JSONB type casting
    });

    return NextResponse.json({ success: true, count: addedKeywords, warnings: warningList.length });

  } catch (error: any) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Failed to process CSV' }, { status: 500 });
  }
}

