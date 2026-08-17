import { readFile } from "node:fs/promises";
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

  CREATE TABLE IF NOT EXISTS news_coverage (
    id text PRIMARY KEY,
    title text NOT NULL DEFAULT '',
    outlet text NOT NULL DEFAULT '',
    article_url text NOT NULL DEFAULT '',
    published_on date,
    status text NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),
    archived_at timestamptz,
    created_by text NOT NULL,
    updated_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS news_coverage_public_order_idx
    ON news_coverage (status, published_on DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS news_coverage_updated_idx
    ON news_coverage (updated_at DESC);
`;

const initialNewsCoverage = [
  ["seed-news-ihe-2026-07-08", "UNC Student Body President Devin Duncan on What Students Want", "Inside Higher Ed", "https://www.insidehighered.com/podcasts/key-podcast/2026/07/08/ep-203-unc-student-body-president-devin-duncan-what-students-want", "2026-07-08"],
  ["seed-news-dth-2026-04-08", "Devin Duncan sworn in as 2026–27 student body president, wants to ‘deliver consistently’ for students", "The Daily Tar Heel", "https://www.dailytarheel.com/article/university-devin-duncan-induction-feature-20260408", "2026-04-08"],
  ["seed-news-ci-2026-03-11", "Student body president-elect Devin Duncan joins Carolina Insider", "Carolina Insider", "https://goheels.com/podcasts/carolina-insider-3-11-26/293", "2026-03-11"],
  ["seed-news-mc-2026-03-02", "Devin Duncan ’28 elected student body president", "Morehead-Cain", "https://www.moreheadcain.org/blog/devin-duncan-28-elected-student-body-president-jakhari-bryant-27-elected-senior-class-president/", "2026-03-02"],
  ["seed-news-dth-2026-02-18", "Devin Duncan elected as 2026–27 student body president", "The Daily Tar Heel", "https://www.dailytarheel.com/article/be71ed84-fc3e-4cc7-9c24-c408923669aa", "2026-02-18"],
] as const;

const welcomeReceptionMedia = {
  id: "3a6cb8ee-0227-4a0d-95af-2683b10c0315",
  fileName: "student-government-welcome-reception.jpg",
  mimeType: "image/jpeg",
  uploadedBy: "bhilberg",
  createdAt: "2026-08-17T18:38:39.231502Z",
} as const;

const welcomeReceptionEvent = {
  id: "adb506f2-3038-4f72-ac10-fe080ce9a397",
  title: "Student Government Welcome Reception",
  slug: "student-government-welcome-reception",
  summary: "Kick off the year with Student Government at our Welcome Reception!",
  detailsMarkdown: `Kick off the year with Student Government at our Welcome Reception! Join students from across Carolina for an evening of free food, live entertainment, and great conversation as we celebrate the start of a new academic year.

Meet and connect with leaders from Student Government and across the University, learn about opportunities to get involved, and hear more about what’s ahead for Carolina this year. Whether you’re already involved or simply want to meet new people and learn more about your campus, everyone is welcome.

Come for the food and entertainment, stay for the people, and help us kick off an exciting year at Carolina.

Go Heels!
`,
  startAt: "2026-08-21T22:00:00Z",
  endAt: "2026-08-22T00:00:00Z",
  location: "Great Hall, Carolina Union",
  registrationUrl: "https://heellife.unc.edu/event/12562068",
  publishAt: "2026-08-17T18:39:56.097324Z",
  publishedAt: "2026-08-17T18:39:56.097324Z",
  createdBy: "bhilberg",
  updatedBy: "bhilberg",
  createdAt: "2026-08-17T18:36:47.152498Z",
  updatedAt: "2026-08-17T18:39:56.097324Z",
} as const;

async function seedWelcomeReception(): Promise<void> {
  const media = await readFile(
    new URL("./seeds/student-government-welcome-reception.jpg", import.meta.url),
  );
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO update_media
       (id, file_name, mime_type, byte_size, content, uploaded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        welcomeReceptionMedia.id,
        welcomeReceptionMedia.fileName,
        welcomeReceptionMedia.mimeType,
        media.byteLength,
        media,
        welcomeReceptionMedia.uploadedBy,
        welcomeReceptionMedia.createdAt,
      ],
    );

    await client.query(
      `INSERT INTO events
       (id, title, slug, summary, details_markdown, hero_media_id, start_at, end_at,
        all_day, event_format, location, registration_url, is_featured, status,
        publish_at, published_at, created_by, updated_by, created_at, updated_at)
       VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, false, 'in-person', $9, $10,
        NOT EXISTS (SELECT 1 FROM events WHERE is_featured = true AND status = 'published'),
        'published', $11, $12, $13, $14, $15, $16)
       ON CONFLICT DO NOTHING`,
      [
        welcomeReceptionEvent.id,
        welcomeReceptionEvent.title,
        welcomeReceptionEvent.slug,
        welcomeReceptionEvent.summary,
        welcomeReceptionEvent.detailsMarkdown,
        welcomeReceptionMedia.id,
        welcomeReceptionEvent.startAt,
        welcomeReceptionEvent.endAt,
        welcomeReceptionEvent.location,
        welcomeReceptionEvent.registrationUrl,
        welcomeReceptionEvent.publishAt,
        welcomeReceptionEvent.publishedAt,
        welcomeReceptionEvent.createdBy,
        welcomeReceptionEvent.updatedBy,
        welcomeReceptionEvent.createdAt,
        welcomeReceptionEvent.updatedAt,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase(authOptions: unknown): Promise<void> {
  const { runMigrations } = await getMigrations(authOptions as never);
  await runMigrations();
  await pool.query(contentSchema);
  await seedWelcomeReception();
  for (const item of initialNewsCoverage) {
    await pool.query(
      `INSERT INTO news_coverage
       (id, title, outlet, article_url, published_on, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'published', 'system', 'system')
       ON CONFLICT (id) DO NOTHING`,
      [...item],
    );
  }
}
