
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { importLogs, domains } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const logs = await db.select({
        id: importLogs.id,
        domainName: domains.domainName,
        importType: importLogs.importType,
        rowsImported: importLogs.rowsImported,
        fileName: importLogs.fileName,
        importedAt: importLogs.importedAt,
        warnings: importLogs.warnings
    })
    .from(importLogs)
    .leftJoin(domains, eq(importLogs.domainId, domains.id))
    .orderBy(desc(importLogs.importedAt))
    .limit(50);

    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
