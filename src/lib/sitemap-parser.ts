
import { XMLParser } from 'fast-xml-parser';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

interface ParsedSitemap {
  urls: SitemapUrl[];
  sitemaps: string[];
}

export class SitemapParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
  }

  async fetchAndParse(url: string): Promise<ParsedSitemap> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const xmlData = await response.text();
    const result = this.parser.parse(xmlData);

    const urls: SitemapUrl[] = [];
    const sitemaps: string[] = [];

    // Handle Sitemap Index (list of sub-sitemaps)
    if (result.sitemapindex && result.sitemapindex.sitemap) {
        const entries = Array.isArray(result.sitemapindex.sitemap) 
            ? result.sitemapindex.sitemap 
            : [result.sitemapindex.sitemap];
        
        entries.forEach((entry: any) => {
            if (entry.loc) sitemaps.push(entry.loc);
        });
    }

    // Handle UrlSet (list of actual pages)
    if (result.urlset && result.urlset.url) {
        const entries = Array.isArray(result.urlset.url)
            ? result.urlset.url
            : [result.urlset.url];
        
        entries.forEach((entry: any) => {
            if (entry.loc) {
                urls.push({
                    loc: entry.loc,
                    lastmod: entry.lastmod
                });
            }
        });
    }

    return { urls, sitemaps };
  }
}
