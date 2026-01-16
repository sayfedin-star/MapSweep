import { NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, keywords, keywordRankings, recipeUrls, importLogs } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import Papa from 'papaparse';

// Helper to extract domain from URL
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Helper to extract slug from URL
function extractSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\/|\/$/g, '') || 'home';
  } catch {
    return 'home';
  }
}

// Safe number parsing
function safeParseInt(val: string | null | undefined, defaultValue: number = 0): number {
  if (val === null || val === undefined) return defaultValue;
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown') return defaultValue;
  const num = parseInt(trimmed.replace(/,/g, ''), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

function safeParseOptionalInt(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown') return null;
  const num = parseInt(trimmed.replace(/,/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

interface SheetInfo {
  gid: string;
  name: string;
}

interface ImportResult {
  domain: string;
  keywordsImported: number;
  urlsCreated: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    url = url.trim();
    let sheetTabs: SheetInfo[] = [];
    let spreadsheetId: string = '';

    // Check if it's a "Publish to web" URL (/d/e/...) or direct CSV
    if (url.includes('/d/e/') || url.includes('output=csv')) {
      
      // For published URLs, we import directly - each published link is one tab
      // Ensure it ends with output=csv
      let csvUrl = url;
      if (!url.includes('output=csv')) {
        csvUrl = url.includes('?') ? `${url}&output=csv` : `${url}?output=csv`;
      }
      
      // Extract gid if present
      const gidMatch = url.match(/gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      sheetTabs = [{ gid, name: `Sheet (gid=${gid})` }];
      // Store the base URL for fetching
      spreadsheetId = csvUrl; // We'll use this directly
    } else {
      // Standard Google Sheets URL (/d/SHEET_ID/)
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
      }
      spreadsheetId = match[1];

      // Try to get all sheet tabs
      try {
        const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        const html = await htmlRes.text();
        
        const tabMatches = html.matchAll(/gid=(\d+)[^>]*>([^<]+)</g);
        for (const m of tabMatches) {
          sheetTabs.push({ gid: m[1], name: m[2] });
        }
      } catch {
        console.log('Could not fetch sheet tabs, using gid from URL or default');
      }

      if (sheetTabs.length === 0) {
        const gidMatch = url.match(/gid=(\d+)/);
        sheetTabs = [{ gid: gidMatch ? gidMatch[1] : '0', name: 'Sheet1' }];
      }
    }

    console.log('Found sheet tabs:', sheetTabs);

    const importDate = new Date();
    const results: ImportResult[] = [];
    
    // Pre-load existing keywords into memory for fast lookup
    const existingKeywordsData = await db.select({ id: keywords.id, text: keywords.keywordText }).from(keywords);
    const keywordMap = new Map<string, number>(existingKeywordsData.map(k => [k.text, k.id]));
    
    // Pre-load existing domains
    const existingDomainsData = await db.select({ id: domains.id, name: domains.domainName }).from(domains);
    const domainMap = new Map<string, number>(existingDomainsData.map(d => [d.name, d.id]));

    // Process each tab
    for (const tab of sheetTabs) {
      console.log(`Processing tab: ${tab.name} (gid=${tab.gid})`);
      
      // Fetch CSV for this tab
      // For published URLs, spreadsheetId is the full CSV URL
      // For standard URLs, we construct the export URL
      const csvUrl = spreadsheetId.includes('output=csv') || spreadsheetId.includes('/d/e/')
        ? spreadsheetId 
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${tab.gid}`;
      
      console.log('Fetching CSV from:', csvUrl);
      const csvRes = await fetch(csvUrl);
      
      if (!csvRes.ok) {
        console.error(`Failed to fetch tab ${tab.name}`);
        continue;
      }

      const csvText = await csvRes.text();
      const { data, meta } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = data as Record<string, string>[];
      
      if (rows.length === 0) continue;

      // Map columns
      const headers = meta.fields || [];
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

      // Skip if missing required columns
      if (!columnMap['Keyword'] || !columnMap['Link']) {
        console.log(`Tab ${tab.name} missing required columns, skipping`);
        continue;
      }

      // Detect domain from first row's Link
      const firstLink = rows[0]?.[columnMap['Link']];
      const detectedDomain = extractDomain(firstLink || '');
      
      if (!detectedDomain) {
        console.log(`Could not detect domain from tab ${tab.name}`);
        continue;
      }

      console.log(`Detected domain: ${detectedDomain} from ${rows.length} rows`);

      // Get or create domain
      let domainId = domainMap.get(detectedDomain);
      
      if (!domainId) {
        const newDomain = await db.insert(domains).values({
          domainName: detectedDomain,
          status: 'active'
        }).returning();
        domainId = newDomain[0].id;
        domainMap.set(detectedDomain, domainId);
        console.log(`Created new domain: ${detectedDomain}`);
      }

      // Pre-load existing URLs for this domain
      const existingUrls = await db.select({ id: recipeUrls.id, url: recipeUrls.url })
        .from(recipeUrls)
        .where(eq(recipeUrls.domainId, domainId));
      const urlMap = new Map<string, number>(existingUrls.map(u => [u.url, u.id]));

      // Clear old rankings for this domain
      await db.delete(keywordRankings).where(eq(keywordRankings.domainId, domainId));

      // Collect all data first
      const newKeywords: string[] = [];
      const newUrls: { url: string; slug: string; domainId: number }[] = [];
      const rankingsToInsert: {
        keywordText: string;
        url: string;
        position: number;
        positionChange: number | null;
        volume: number;
        pin: string | null;
      }[] = [];

      for (const row of rows) {
        const keywordText = row[columnMap['Keyword']]?.trim();
        const link = row[columnMap['Link']]?.trim();
        
        if (!keywordText || !link) continue;

        const position = safeParseInt(row[columnMap['Position']]);
        const volume = safeParseInt(row[columnMap['Volume']]);
        const positionChange = columnMap['Change'] ? safeParseOptionalInt(row[columnMap['Change']]) : null;
        const pin = row[columnMap['Pin']]?.trim() || null;

        // Track new keywords
        if (!keywordMap.has(keywordText)) {
          newKeywords.push(keywordText);
          keywordMap.set(keywordText, -1); // placeholder
        }

        // Track new URLs
        if (!urlMap.has(link)) {
          newUrls.push({ url: link, slug: extractSlug(link), domainId });
          urlMap.set(link, -1); // placeholder
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
          const inserted = await db.insert(keywords)
            .values(chunk.map(k => ({ keywordText: k })))
            .onConflictDoNothing()
            .returning();
          
          for (const kw of inserted) {
            keywordMap.set(kw.keywordText, kw.id);
          }
        }

        // Reload keywords to get IDs for ones that already existed
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
              domainId: u.domainId,
              source: 'sheets_import',
              lastModified: importDate
            })))
            .onConflictDoNothing()
            .returning();
          
          urlsCreated += inserted.length;
          for (const url of inserted) {
            urlMap.set(url.url, url.id);
          }
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
      })).filter(r => r.keywordId); // Only insert if we have a valid keyword ID

      if (rankingValues.length > 0) {
        const chunks = [];
        for (let i = 0; i < rankingValues.length; i += 500) {
          chunks.push(rankingValues.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          await db.insert(keywordRankings).values(chunk).onConflictDoNothing();
        }
      }

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
        fileName: `Google Sheets - ${tab.name}`,
      });

      results.push({
        domain: detectedDomain,
        keywordsImported: rankingValues.length,
        urlsCreated
      });

      console.log(`Completed ${detectedDomain}: ${rankingValues.length} keywords`);
    }

    return NextResponse.json({
      success: true,
      results,
      totalDomains: results.length,
      totalKeywords: results.reduce((sum, r) => sum + r.keywordsImported, 0)
    });

  } catch (error: unknown) {
    console.error('Multi-import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Import failed: ${errorMessage}` }, { status: 500 });
  }
}
