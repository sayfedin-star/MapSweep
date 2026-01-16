import { NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, keywords, keywordRankings, recipeUrls, importLogs } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import Papa from 'papaparse';

// Safe number parsing - always returns a number, never NaN
function safeParseInt(val: string | null | undefined, defaultValue: number = 0): number {
  if (val === null || val === undefined) return defaultValue;
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown') return defaultValue;
  const num = parseInt(trimmed.replace(/,/g, ''), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

// Safe optional number parsing - returns null for empty/invalid
function safeParseOptionalInt(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown') return null;
  const num = parseInt(trimmed.replace(/,/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

// Extract slug from URL
function extractSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\/|\/$/g, '') || 'home';
  } catch {
    return 'home';
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const domainId = parseInt(params.id);
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Fetch CSV from Google Sheets URL
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch spreadsheet. Make sure it is shared publicly.' }, { status: 400 });
    }
    
    const text = await response.text();
    const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    const headers = meta.fields || [];
    console.log('Found columns:', headers);
    
    // Map column headers to standard names (case-insensitive)
    const columnMap: Record<string, string> = {};
    
    for (const header of headers) {
      const lower = header.toLowerCase().trim();
      if (lower === 'keyword' || lower.includes('keyword')) columnMap['Keyword'] = header;
      if (lower === 'volume') columnMap['Volume'] = header;
      if (lower === 'link' || lower === 'url') columnMap['Link'] = header;
      if (lower === 'pin' || lower === 'pinterest') columnMap['Pin'] = header;
      if (lower === 'position' || lower.includes('position')) columnMap['Position'] = header;
      if (lower === 'change') columnMap['Change'] = header;
    }
    
    // Check required columns
    const requiredCols = ['Keyword', 'Volume', 'Link', 'Pin'];
    const missingCols = requiredCols.filter(col => !columnMap[col]);
    
    if (missingCols.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingCols.join(', ')}. Found: ${headers.join(', ')}` 
      }, { status: 400 });
    }

    const importDate = new Date();
    const rows = data as Record<string, string>[];
    console.log('Total rows to process:', rows.length);
    
    // Pre-load existing keywords into memory
    const existingKeywordsData = await db.select({ id: keywords.id, text: keywords.keywordText }).from(keywords);
    const keywordMap = new Map<string, number>(existingKeywordsData.map(k => [k.text, k.id]));

    // Pre-load existing URLs for this domain
    const existingUrls = await db.select({ id: recipeUrls.id, url: recipeUrls.url })
      .from(recipeUrls)
      .where(eq(recipeUrls.domainId, domainId));
    const urlMap = new Map<string, number>(existingUrls.map(u => [u.url, u.id]));

    // Clear old rankings for this domain
    console.log('Deleting old rankings for domain:', domainId);
    await db.delete(keywordRankings).where(eq(keywordRankings.domainId, domainId));

    // Collect all data first
    const newKeywords: string[] = [];
    const newUrls: { url: string; slug: string }[] = [];
    const rankingsToInsert: {
      keywordText: string;
      url: string;
      position: number;
      positionChange: number | null;
      volume: number;
      pin: string | null;
    }[] = [];

    let skippedRows = 0;

    for (const row of rows) {
      const keywordText = row[columnMap['Keyword']]?.trim();
      const link = row[columnMap['Link']]?.trim();
      
      if (!keywordText || !link) {
        skippedRows++;
        continue;
      }

      const position = safeParseInt(row[columnMap['Position']]);
      const volume = safeParseInt(row[columnMap['Volume']]);
      const positionChange = columnMap['Change'] ? safeParseOptionalInt(row[columnMap['Change']]) : null;
      const pin = row[columnMap['Pin']]?.trim() || null;

      // Track new keywords
      if (!keywordMap.has(keywordText)) {
        newKeywords.push(keywordText);
        keywordMap.set(keywordText, -1);
      }

      // Track new URLs
      if (!urlMap.has(link)) {
        newUrls.push({ url: link, slug: extractSlug(link) });
        urlMap.set(link, -1);
      }

      rankingsToInsert.push({ keywordText, url: link, position, positionChange, volume, pin });
    }

    // Batch insert new keywords
    if (newKeywords.length > 0) {
      const uniqueNewKeywords = [...new Set(newKeywords)];
      const chunks = [];
      for (let i = 0; i < uniqueNewKeywords.length; i += 500) {
        chunks.push(uniqueNewKeywords.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        await db.insert(keywords)
          .values(chunk.map(k => ({ keywordText: k })))
          .onConflictDoNothing();
      }

      // Reload keywords to get IDs
      const allKeywordsNeeded = [...new Set(rankingsToInsert.map(r => r.keywordText))];
      const refreshedKeywords = await db.select({ id: keywords.id, text: keywords.keywordText })
        .from(keywords)
        .where(inArray(keywords.keywordText, allKeywordsNeeded));
      
      for (const kw of refreshedKeywords) {
        keywordMap.set(kw.text, kw.id);
      }
    }

    // Batch insert new URLs
    let urlsCreated = 0;
    if (newUrls.length > 0) {
      const uniqueNewUrls = newUrls.filter((u, i, self) => 
        self.findIndex(x => x.url === u.url) === i
      );
      
      const chunks = [];
      for (let i = 0; i < uniqueNewUrls.length; i += 500) {
        chunks.push(uniqueNewUrls.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const inserted = await db.insert(recipeUrls)
          .values(chunk.map(u => ({
            url: u.url,
            slug: u.slug,
            domainId,
            source: 'sheets_import',
            lastModified: importDate
          })))
          .onConflictDoNothing()
          .returning();
        
        urlsCreated += inserted.length;
      }

      // Reload URLs to get IDs
      const allUrlsNeeded = [...new Set(rankingsToInsert.map(r => r.url))];
      const refreshedUrls = await db.select({ id: recipeUrls.id, url: recipeUrls.url })
        .from(recipeUrls)
        .where(inArray(recipeUrls.url, allUrlsNeeded));
      
      for (const u of refreshedUrls) {
        urlMap.set(u.url, u.id);
      }
    }

    // Batch insert rankings
    const rankingValues = rankingsToInsert.map(r => ({
      domainId,
      keywordId: keywordMap.get(r.keywordText)!,
      recipeUrlId: urlMap.get(r.url) || null,
      position: r.position,
      positionChange: r.positionChange,
      searchVolume: r.volume,
      pinterestPinUrl: r.pin,
      trackedDate: importDate.toISOString().split('T')[0]
    })).filter(r => r.keywordId);

    if (rankingValues.length > 0) {
      const chunks = [];
      for (let i = 0; i < rankingValues.length; i += 500) {
        chunks.push(rankingValues.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        await db.insert(keywordRankings).values(chunk).onConflictDoNothing();
      }
    }

    console.log('Import complete:', { added: rankingValues.length, skipped: skippedRows });

    // Update domain stats
    await db.update(domains)
      .set({ 
        lastKeywordsImport: importDate,
        totalKeywords: rankingValues.length 
      })
      .where(eq(domains.id, domainId));

    // Log import
    await db.insert(importLogs).values({
      domainId,
      importType: 'keywords',
      rowsImported: rankingValues.length,
      rowsSkipped: skippedRows,
      fileName: 'Google Sheets Import',
    });

    return NextResponse.json({ 
      success: true, 
      count: rankingValues.length, 
      skipped: skippedRows,
      urlsCreated
    });

  } catch (error: unknown) {
    console.error('Sheets import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to import: ${errorMessage}` }, { status: 500 });
  }
}

