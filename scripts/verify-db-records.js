const { Client } = require("pg");

async function main() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5433/legacy_vault";
  console.log(`Connecting to database: ${dbUrl}`);

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected successfully!");

    // Query AuditEvents logged by the agent
    console.log("\n--- Querying AuditEvent table ---");
    const auditRes = await client.query(
      'SELECT id, "vaultId", "actorId", action, detail, "occurredAt" FROM "AuditEvent" WHERE "vaultId" = $1 ORDER BY "occurredAt" DESC LIMIT 5',
      ["vault-demo-001"]
    );

    console.log(`Found ${auditRes.rows.length} audit events:`);
    for (const row of auditRes.rows) {
      console.log(`- Action: ${row.action} | Occurred At: ${row.occurredAt}`);
      console.log(`  Details: ${JSON.stringify(row.detail)}`);
    }

    // Query AssetRecords created by the agent
    console.log("\n--- Querying AssetRecord table ---");
    const assetRes = await client.query(
      'SELECT id, "vaultId", category, label, description, "createdAt" FROM "AssetRecord" WHERE "vaultId" = $1 AND category = $2 ORDER BY "createdAt" DESC LIMIT 5',
      ["vault-demo-001", "WEB3_WALLET"]
    );

    console.log(`Found ${assetRes.rows.length} asset records:`);
    for (const row of assetRes.rows) {
      console.log(`- Label: ${row.label} | Category: ${row.category}`);
      console.log(`  Description: ${row.description}`);
    }

    await client.end();

    if (auditRes.rows.length === 0) {
      console.error("FAIL: No audit events found for vault-demo-001");
      process.exit(1);
    }
    console.log("\nSUCCESS: Database verification complete!");
  } catch (err) {
    console.error("Database query failed:", err.message);
    process.exit(1);
  }
}

main();
