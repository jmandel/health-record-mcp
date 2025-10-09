import { readFileSync } from 'fs';
import postgres from 'postgres';

const sql = postgres('postgres://our-healths:D56PhhN5IdSjHDcPwE2w@10.0.15.109:5432/our-healths?sslmode=disable');
const schema = readFileSync('schema.sql', 'utf-8');

console.log('🗑️  Applying schema...');
await sql.unsafe(schema);
console.log('✅ Schema applied successfully');

await sql.end();
