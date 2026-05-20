// Seed script: create initial users in ggads_users.
// Run with: npx tsx scripts/seed-users.ts

import { getDb } from "../src/lib/mongodb";
import { hash } from "bcryptjs";

async function seed() {
  const db = await getDb();
  const coll = process.env.COLLECTION_USERS ?? "ggads_users";

  // Only seed if empty
  const count = await db.collection(coll).countDocuments();
  if (count > 0) {
    console.log(`${count} user(s) already exist — skipping seed.`);
    process.exit(0);
  }

  const users = [
    {
      email: "admin@agency.com",
      passwordHash: await hash("admin123", 12),
      name: "Admin",
      role: "account_manager",
      createdAt: new Date().toISOString(),
      loginCount: 0,
    },
    {
      email: "client@example.se",
      passwordHash: await hash("client123", 12),
      name: "Client User",
      role: "client",
      clientId: "c1",
      domain: ".se",
      company: "Example Brand",
      createdAt: new Date().toISOString(),
      loginCount: 0,
    },
  ];

  await db.collection(coll).insertMany(users);
  console.log(`Seeded ${users.length} user(s) into ${coll}.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
