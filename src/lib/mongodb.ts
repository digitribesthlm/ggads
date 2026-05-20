import { MongoClient, Db } from "mongodb";

const uri = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

interface MongoCache {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<Db> | null;
}

const globalWithMongo = globalThis as typeof globalThis & {
  _ggadsMongo?: MongoCache;
};

if (!globalWithMongo._ggadsMongo) {
  globalWithMongo._ggadsMongo = { client: null, db: null, promise: null };
}

export async function getDb(): Promise<Db> {
  const cache = globalWithMongo._ggadsMongo!;
  if (cache.db) return cache.db;

  if (!cache.promise) {
    cache.promise = (async () => {
      cache.client = new MongoClient(uri);
      await cache.client.connect();
      cache.db = cache.client.db(dbName);
      return cache.db;
    })();
  }

  return cache.promise;
}
