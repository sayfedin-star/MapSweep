import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not defined in environment variables. Database features will not work.');
}

const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@placeholder:5432/placeholder');
export const db = drizzle(sql, { schema });
