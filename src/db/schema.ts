import { pgTable, serial, text, integer, timestamp, date, jsonb, unique, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  domainName: text('domain_name').unique().notNull(),
  pinclicksAccountUrl: text('pinclicks_account_url'),
  monthlyViews: integer('monthly_views'),
  totalKeywords: integer('total_keywords'),
  totalRecipeUrls: integer('total_recipe_urls').default(0),
  status: text('status').default('active'),
  lastSitemapImport: timestamp('last_sitemap_import'),
  lastKeywordsImport: timestamp('last_keywords_import'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recipeUrls = pgTable('recipe_urls', {
  id: serial('id').primaryKey(),
  domainId: integer('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  url: text('url').unique().notNull(),
  slug: text('slug').notNull(),
  lastModified: timestamp('last_modified'),
  images: jsonb('images'),
  source: text('source').default('sitemap'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const keywords = pgTable('keywords', {
  id: serial('id').primaryKey(),
  keywordText: text('keyword_text').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const keywordRankings = pgTable('keyword_rankings', {
  id: serial('id').primaryKey(),
  keywordId: integer('keyword_id').references(() => keywords.id, { onDelete: 'cascade' }),
  domainId: integer('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  recipeUrlId: integer('recipe_url_id').references(() => recipeUrls.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  positionChange: integer('position_change'),
  searchVolume: integer('search_volume'),
  pinterestPinUrl: text('pinterest_pin_url'),
  pinImageUrl: text('pin_image_url'),
  trackedDate: date('tracked_date').notNull(),
  importedAt: timestamp('imported_at').defaultNow(),
}, (t) => ({
  unq: unique().on(t.keywordId, t.domainId),
}));

export const importLogs = pgTable('import_logs', {
  id: serial('id').primaryKey(),
  domainId: integer('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  importType: text('import_type').notNull(), // 'sitemap' | 'keywords'
  fileName: text('file_name'),
  rowsImported: integer('rows_imported'),
  rowsSkipped: integer('rows_skipped'),
  warnings: jsonb('warnings'),
  importedBy: text('imported_by'),
  importedAt: timestamp('imported_at').defaultNow(),
});

// Relations
export const domainsRelations = relations(domains, ({ many }) => ({
  recipeUrls: many(recipeUrls),
  keywordRankings: many(keywordRankings),
  importLogs: many(importLogs),
}));

export const recipeUrlsRelations = relations(recipeUrls, ({ one, many }) => ({
  domain: one(domains, {
    fields: [recipeUrls.domainId],
    references: [domains.id],
  }),
  keywordRankings: many(keywordRankings),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  rankings: many(keywordRankings),
}));

export const keywordRankingsRelations = relations(keywordRankings, ({ one }) => ({
  keyword: one(keywords, {
    fields: [keywordRankings.keywordId],
    references: [keywords.id],
  }),
  domain: one(domains, {
    fields: [keywordRankings.domainId],
    references: [domains.id],
  }),
  recipeUrl: one(recipeUrls, {
    fields: [keywordRankings.recipeUrlId],
    references: [recipeUrls.id],
  }),
}));

export const importLogsRelations = relations(importLogs, ({ one }) => ({
  domain: one(domains, {
    fields: [importLogs.domainId],
    references: [domains.id],
  }),
}));

// Global Settings Table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
