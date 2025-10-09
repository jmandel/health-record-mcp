import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgres://our-healths:D56PhhN5IdSjHDcPwE2w@10.0.15.109:5432/our-healths?sslmode=disable' 
});

await client.connect();

const result = await client.query(`
  SELECT 
    resource_id, 
    resource_json
  FROM fhir_resources 
  WHERE resource_type = 'Condition' 
  LIMIT 2
`);

console.log('Condition resources:');
result.rows.forEach((row, i) => {
  console.log(`\n=== Condition ${i + 1} ===`);
  console.log(JSON.stringify(row.resource_json, null, 2));
});

await client.end();
