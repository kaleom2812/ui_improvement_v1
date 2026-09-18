import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // For local testing without a real URL, provide fallbacks (though Postgres requires a valid URL usually)
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT) || 5432,
      user: process.env.MYSQL_USER || "postgres",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "geo_tool",
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

/**
 * Initializes the Postgres tables if they don't exist yet.
 */
export async function initializeDatabase() {
  try {
    const db = getDbPool();

    // 1. Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        image_url VARCHAR(500),
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. User Projects / Audited Domains Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_projects (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        folder_name VARCHAR(100) DEFAULT 'General',
        latest_score INT DEFAULT 0,
        data_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create an index if it doesn't exist (Postgres syntax)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_domain ON user_projects (user_id, domain);`);

    // 3. User Custom Folders
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_folders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        folder_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, folder_name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Postgres database tables initialized successfully.");
  } catch (error) {
    console.warn("⚠️ Postgres Initialization note (safe if running locally without DB):", error);
  }
}
