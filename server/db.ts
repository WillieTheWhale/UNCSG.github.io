import { Pool as PostgresPool, type Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { config } from "./config.js";

async function createPool(): Promise<Pool> {
  if (config.databaseUrl === "pg-mem://") {
    if (config.isProduction) throw new Error("The in-memory test database cannot run in production.");
    const { newDb, DataType } = await import("pg-mem");
    const memory = newDb();
    memory.public.registerOperator({
      operator: "!~" as never,
      left: DataType.text,
      right: DataType.text,
      returns: DataType.bool,
      implementation: (value: string, pattern: string) => !new RegExp(pattern).test(value),
    });
    memory.public.registerFunction({
      name: "current_database",
      returns: DataType.text,
      implementation: () => "uncsg_updates_test",
    });
    memory.public.registerFunction({
      name: "version",
      returns: DataType.text,
      implementation: () => "PostgreSQL 16 test database",
    });
    memory.public.registerFunction({
      name: "has_schema_privilege",
      args: [DataType.text, DataType.text],
      returns: DataType.bool,
      implementation: () => true,
    });
    memory.public.registerFunction({
      name: "col_description",
      args: [DataType.integer, DataType.integer],
      returns: DataType.text,
      allowNullArguments: true,
      implementation: () => null,
    });
    memory.public.registerFunction({
      name: "quote_ident",
      args: [DataType.text],
      returns: DataType.text,
      implementation: (value: string) => value,
    });
    memory.public.registerFunction({
      name: "pg_get_serial_sequence",
      args: [DataType.text, DataType.text],
      returns: DataType.text,
      allowNullArguments: true,
      implementation: () => null,
    });
    const adapter = memory.adapters.createPg();
    return new adapter.Pool() as Pool;
  }

  return new PostgresPool({
    connectionString: config.databaseUrl,
    max: 10,
    ssl:
      config.isProduction && process.env.DATABASE_SSL === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

export const pool = await createPool();

const contentSchema = `
  CREATE TABLE IF NOT EXISTS update_media (
    id text PRIMARY KEY,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    byte_size integer NOT NULL CHECK (byte_size > 0),
    content bytea NOT NULL,
    uploaded_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS updates (
    id text PRIMARY KEY,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    body_markdown text NOT NULL DEFAULT '',
    hero_media_id text REFERENCES update_media(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'preview'
      CHECK (status IN ('preview', 'scheduled', 'published', 'archived')),
    publish_at timestamptz,
    published_at timestamptz,
    archived_at timestamptz,
    created_by text NOT NULL,
    updated_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS updates_public_order_idx
    ON updates (status, publish_at DESC, published_at DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS updates_updated_idx ON updates (updated_at DESC);

  CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    summary text NOT NULL DEFAULT '',
    details_markdown text NOT NULL DEFAULT '',
    hero_media_id text REFERENCES update_media(id) ON DELETE SET NULL,
    start_at timestamptz,
    end_at timestamptz,
    all_day boolean NOT NULL DEFAULT false,
    event_format text NOT NULL DEFAULT 'in-person'
      CHECK (event_format IN ('in-person', 'virtual', 'hybrid')),
    location text,
    virtual_url text,
    registration_url text,
    contact_email text,
    is_featured boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'preview'
      CHECK (status IN ('preview', 'scheduled', 'published', 'archived')),
    publish_at timestamptz,
    published_at timestamptz,
    archived_at timestamptz,
    created_by text NOT NULL,
    updated_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS events_public_order_idx
    ON events (status, start_at, end_at);
  CREATE INDEX IF NOT EXISTS events_updated_idx ON events (updated_at DESC);
  CREATE INDEX IF NOT EXISTS events_featured_idx ON events (is_featured, status);
`;

export async function initializeDatabase(authOptions: unknown): Promise<void> {
  const { runMigrations } = await getMigrations(authOptions as never);
  await runMigrations();
  await pool.query(contentSchema);
}
