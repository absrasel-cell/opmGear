import { MongoClient, ServerApiVersion } from 'mongodb';

// Use the actual MongoDB URI from your configuration
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

if (uri.includes('<db_password>')) {
  throw new Error('Please replace <db_password> with your actual MongoDB password in .env.local');
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = client.connect();
}

export default clientPromise;

// Helper function to get database
export async function getDatabase() {
  const client = await clientPromise;
  // Use the default database from your connection string
  return client.db(); // This will use the default database from the connection string
}

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

// Helper function to ping the database
export async function pingDatabase() {
  try {
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
    return true;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return false;
  }
}

// Connect to database function (used by API routes)
export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(); // Use default database from connection string
    return { client, db };
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw new Error("Failed to connect to database");
  }
}
