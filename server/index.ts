import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import multer from "multer";
import { DateTime } from "luxon";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth, consumeOtpDeliveryResult, developmentOtpForEmail } from "./auth.js";
import {
  config,
  microsoftAuthConfigured,
  trustedOrigins,
  uncOpenShiftAuthConfigured,
} from "./config.js";
import { initializeDatabase, pool } from "./db.js";
import { isAllowedStaffEmail, onyenFromEmail } from "./access.js";
import { renderMarkdown } from "./markdown.js";
import {
  eventMonthBounds,
  eventPublicationIssue,
  parseEventLocalBoundary,
} from "./events.js";
import {
  articlePatchSchema,
  eventFeatureSchema,
  eventPatchSchema,
  scheduleSchema,
  slugifyEventTitle,
  slugifyTitle,
} from "./validation.js";

type StaffRequest = Request & {
  staff?: { email: string; onyen: string };
};

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

if (!config.isProduction) {
  app.get("/api/dev/auth-code", (request, response) => {
    const email = typeof request.query.email === "string" ? request.query.email : "";
    const code = developmentOtpForEmail(email);
    response.set("Cache-Control", "no-store");
    if (!code) {
      response.status(404).json({ error: "code_not_ready" });
      return;
    }
    response.json({ code });
  });
}

app.get("/api/auth/otp-delivery-status", (request, response) => {
  const requestId = typeof request.query.requestId === "string" ? request.query.requestId : "";
  if (!/^[a-f0-9-]{36}$/i.test(requestId)) {
    response.status(400).json({ message: "Invalid delivery request." });
    return;
  }
  const result = consumeOtpDeliveryResult(requestId);
  response.set("Cache-Control", "no-store");
  if (!result) {
    response.status(404).json({ message: "Email delivery could not be confirmed." });
    return;
  }
  response.status(result.success ? 200 : 502).json(result);
});

app.get("/api/auth/provider-status", (_request, response) => {
  response.set("Cache-Control", "no-store");
  response.json({
    uncOpenShift: uncOpenShiftAuthConfigured,
    microsoft: microsoftAuthConfigured,
  });
});

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (allowed.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Use a JPEG, PNG, WebP, or GIF image."));
  },
});

function asyncRoute(
  handler: (request: StaffRequest, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: StaffRequest, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function mediaUrl(id: string | null): string | null {
  return id ? `/api/media/${id}` : null;
}

function publicArticle(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    bodyHtml: renderMarkdown(String(row.body_markdown ?? "")),
    heroImageUrl: mediaUrl(row.hero_media_id as string | null),
    publishedAt: row.effective_published_at ?? row.published_at ?? row.created_at,
    updatedAt: row.updated_at,
  };
}

function staffArticle(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    bodyMarkdown: row.body_markdown,
    bodyHtml: renderMarkdown(String(row.body_markdown ?? "")),
    heroMediaId: row.hero_media_id,
    heroImageUrl: mediaUrl(row.hero_media_id as string | null),
    status: row.status,
    publishAt: row.publish_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function publicEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    detailsHtml: renderMarkdown(String(row.details_markdown ?? "")),
    heroImageUrl: mediaUrl(row.hero_media_id as string | null),
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    format: row.event_format,
    location: row.location,
    virtualUrl: row.virtual_url,
    registrationUrl: row.registration_url,
    contactEmail: row.contact_email,
    isFeatured: row.is_featured,
    publishedAt: row.effective_published_at ?? row.published_at ?? row.created_at,
    updatedAt: row.updated_at,
  };
}

function staffEvent(row: Record<string, unknown>) {
  return {
    ...publicEvent(row),
    detailsMarkdown: row.details_markdown,
    heroMediaId: row.hero_media_id,
    status: row.status,
    publishAt: row.publish_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

async function eventForPublication(id: string) {
  const result = await pool.query("SELECT * FROM events WHERE id = $1 LIMIT 1", [id]);
  if (!result.rowCount) return { row: null, issue: null };
  const row = result.rows[0] as Record<string, unknown>;
  return { row, issue: eventPublicationIssue(row) };
}

async function requireStaff(request: StaffRequest, response: Response, next: NextFunction) {
  const sessionResult = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
    returnHeaders: true,
  });
  for (const cookie of sessionResult.headers.getSetCookie()) {
    response.append("Set-Cookie", cookie);
  }
  response.set("Cache-Control", "no-store");
  const session = sessionResult.response;
  if (!session?.user?.email) {
    response.status(401).json({ error: "sign_in_required" });
    return;
  }
  const email = session.user.email.toLowerCase();
  const onyen = onyenFromEmail(email);
  if (!onyen || !isAllowedStaffEmail(email)) {
    response.status(403).json({
      error: "access_denied",
      redirect: "/?auth=unauthorized",
    });
    return;
  }
  request.staff = { email, onyen };
  next();
}

function requireSameOrigin(request: Request, response: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }
  const source = request.get("origin") ?? request.get("referer");
  try {
    if (source && trustedOrigins.includes(new URL(source).origin)) {
      next();
      return;
    }
  } catch {
    // Return the same failure below for malformed sources.
  }
  response.status(403).json({ error: "invalid_request_origin" });
}

app.get(
  "/api/health",
  asyncRoute(async (_request, response) => {
    await pool.query("SELECT 1");
    response.json({ ok: true });
  }),
);

app.get(
  "/api/media/:id",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      "SELECT file_name, mime_type, content, created_at FROM update_media WHERE id = $1",
      [request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "media_not_found" });
      return;
    }
    const media = result.rows[0];
    const storedContent = media.content;
    const content = Buffer.isBuffer(storedContent)
      ? storedContent[0] === 0x5c && storedContent[1] === 0x78
        ? Buffer.from(storedContent.toString("utf8").slice(2), "hex")
        : storedContent
      : Buffer.from(String(storedContent).replace(/^\\x/, ""), "hex");
    response.set({
      "Content-Type": media.mime_type,
      "Content-Length": String(content.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    response.send(content);
  }),
);

app.get(
  "/api/updates",
  asyncRoute(async (request, response) => {
    const requestedLimit = Number(request.query.limit ?? 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, requestedLimit))
      : 50;
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM updates
       WHERE status = 'published'
          OR (status = 'scheduled' AND publish_at <= now())
       ORDER BY effective_published_at DESC
       LIMIT $1`,
      [limit],
    );
    response.json({ updates: result.rows.map(publicArticle) });
  }),
);

app.get(
  "/api/updates/:slug",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM updates
       WHERE slug = $1
         AND (status = 'published' OR (status = 'scheduled' AND publish_at <= now()))
       LIMIT 1`,
      [request.params.slug],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: publicArticle(result.rows[0]) });
  }),
);

app.get(
  "/api/events",
  asyncRoute(async (request, response) => {
    const requestedLimit = Number(request.query.limit ?? 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, requestedLimit))
      : 100;
    const scope = request.query.scope === "past" || request.query.scope === "all"
      ? request.query.scope
      : "upcoming";
    const format = typeof request.query.format === "string" ? request.query.format : "";
    const month = typeof request.query.month === "string" ? request.query.month : "";
    const values: unknown[] = [];
    const parameter = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    const conditions = [
      "(status = 'published' OR (status = 'scheduled' AND publish_at <= now()))",
    ];

    if (scope === "past") {
      conditions.push("COALESCE(end_at, start_at) < now()");
    } else if (scope === "upcoming") {
      conditions.push("COALESCE(end_at, start_at) >= now()");
    }

    if (["in-person", "virtual", "hybrid"].includes(format)) {
      conditions.push(`event_format = ${parameter(format)}`);
    }

    if (month) {
      const bounds = eventMonthBounds(month);
      if (!bounds) {
        response.status(400).json({ error: "invalid_month" });
        return;
      }
      const monthStart = parameter(bounds.start);
      const monthEnd = parameter(bounds.end);
      conditions.push(`start_at < ${monthEnd} AND COALESCE(end_at, start_at) >= ${monthStart}`);
    }

    const limitParameter = parameter(limit);
    const order = scope === "past" ? "start_at DESC" : "start_at ASC";
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM events
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${order} NULLS LAST
       LIMIT ${limitParameter}`,
      values,
    );
    response.json({ events: result.rows.map(publicEvent) });
  }),
);

app.get(
  "/api/events/featured",
  asyncRoute(async (_request, response) => {
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM events
       WHERE is_featured = true
         AND (status = 'published' OR (status = 'scheduled' AND publish_at <= now()))
         AND COALESCE(end_at, start_at) >= now()
       ORDER BY updated_at DESC
       LIMIT 1`,
    );
    response.json({ event: result.rowCount ? publicEvent(result.rows[0]) : null });
  }),
);

app.get(
  "/api/events/:slug",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM events
       WHERE slug = $1
         AND (status = 'published' OR (status = 'scheduled' AND publish_at <= now()))
       LIMIT 1`,
      [request.params.slug],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    response.json({ event: publicEvent(result.rows[0]) });
  }),
);

app.use("/api/staff", asyncRoute(requireStaff), requireSameOrigin);

app.get("/api/staff/session", (request: StaffRequest, response) => {
  response.set("Cache-Control", "no-store");
  response.json({ staff: request.staff });
});

app.get(
  "/api/staff/updates",
  asyncRoute(async (request, response) => {
    const includeArchived = request.query.archived === "true";
    const result = await pool.query(
      `SELECT * FROM updates
       ${includeArchived ? "" : "WHERE status <> 'archived'"}
       ORDER BY updated_at DESC`,
    );
    response.json({ updates: result.rows.map(staffArticle) });
  }),
);

app.get(
  "/api/staff/preview-updates",
  asyncRoute(async (_request, response) => {
    const result = await pool.query(
      `SELECT *, COALESCE(publish_at, published_at, created_at) AS effective_published_at
       FROM updates
       WHERE status <> 'archived'
       ORDER BY COALESCE(publish_at, published_at, created_at) DESC`,
    );
    response.json({ updates: result.rows.map(staffArticle) });
  }),
);

app.get(
  "/api/staff/preview-updates/:slug",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT * FROM updates WHERE slug = $1 AND status <> 'archived' LIMIT 1`,
      [request.params.slug],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/updates",
  asyncRoute(async (request, response) => {
    const id = randomUUID();
    const title =
      typeof request.body?.title === "string" && request.body.title.trim()
        ? request.body.title.trim().slice(0, 180)
        : "Untitled update";
    const baseSlug = slugifyTitle(title);
    const slug = `${baseSlug}-${id.slice(0, 8)}`;
    const result = await pool.query(
      `INSERT INTO updates (id, title, slug, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [id, title, slug, request.staff?.onyen],
    );
    response.status(201).json({ update: staffArticle(result.rows[0]) });
  }),
);

app.get(
  "/api/staff/updates/:id",
  asyncRoute(async (request, response) => {
    const result = await pool.query("SELECT * FROM updates WHERE id = $1 LIMIT 1", [
      request.params.id,
    ]);
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.patch(
  "/api/staff/updates/:id",
  asyncRoute(async (request, response) => {
    const parsed = articlePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_update", issues: parsed.error.issues });
      return;
    }
    const entries = Object.entries(parsed.data);
    if (!entries.length) {
      response.status(400).json({ error: "no_changes" });
      return;
    }
    const columns: Record<string, string> = {
      title: "title",
      slug: "slug",
      bodyMarkdown: "body_markdown",
      heroMediaId: "hero_media_id",
    };
    const values: unknown[] = entries.map(([, value]) => value);
    const assignments = entries.map(
      ([key], index) => `${columns[key]} = $${index + 1}`,
    );
    values.push(request.staff?.onyen, String(request.params.id));
    try {
      const result = await pool.query(
        `UPDATE updates
         SET ${assignments.join(", ")}, updated_by = $${values.length - 1}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING *`,
        values,
      );
      if (!result.rowCount) {
        response.status(404).json({ error: "update_not_found" });
        return;
      }
      response.json({ update: staffArticle(result.rows[0]) });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        response.status(409).json({ error: "slug_in_use" });
        return;
      }
      throw error;
    }
  }),
);

app.post(
  "/api/staff/updates/:id/publish",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `UPDATE updates
       SET status = 'published', published_at = now(), publish_at = now(), archived_at = NULL,
           updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/updates/:id/preview",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `UPDATE updates
       SET status = 'preview', publish_at = NULL, archived_at = NULL,
           updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/updates/:id/schedule",
  asyncRoute(async (request, response) => {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_schedule", issues: parsed.error.issues });
      return;
    }
    const eastern = DateTime.fromISO(parsed.data.publishAtLocal, {
      zone: "America/New_York",
    });
    if (!eastern.isValid) {
      response.status(400).json({ error: "invalid_schedule" });
      return;
    }
    const when = eastern.toUTC().toJSDate();
    const publishNow = when.getTime() <= Date.now();
    const result = await pool.query(
      `UPDATE updates
       SET status = $1, publish_at = $2,
           published_at = CASE WHEN $1 = 'published' THEN now() ELSE published_at END,
           archived_at = NULL, updated_by = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [publishNow ? "published" : "scheduled", when, request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/updates/:id/archive",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `UPDATE updates
       SET status = 'archived', archived_at = now(), updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "update_not_found" });
      return;
    }
    response.json({ update: staffArticle(result.rows[0]) });
  }),
);

app.get(
  "/api/staff/events",
  asyncRoute(async (request, response) => {
    const includeArchived = request.query.archived === "true";
    const result = await pool.query(
      `SELECT * FROM events
       ${includeArchived ? "" : "WHERE status <> 'archived'"}
       ORDER BY updated_at DESC`,
    );
    response.json({ events: result.rows.map(staffEvent) });
  }),
);

app.get(
  "/api/staff/preview-events",
  asyncRoute(async (_request, response) => {
    const result = await pool.query(
      `SELECT * FROM events
       WHERE status <> 'archived'
       ORDER BY start_at ASC NULLS LAST, updated_at DESC`,
    );
    response.json({ events: result.rows.map(staffEvent) });
  }),
);

app.get(
  "/api/staff/preview-events/:slug",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT * FROM events WHERE slug = $1 AND status <> 'archived' LIMIT 1`,
      [request.params.slug],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/events",
  asyncRoute(async (request, response) => {
    const id = randomUUID();
    const title =
      typeof request.body?.title === "string" && request.body.title.trim()
        ? request.body.title.trim().slice(0, 180)
        : "Untitled event";
    const slug = `${slugifyEventTitle(title)}-${id.slice(0, 8)}`;
    const result = await pool.query(
      `INSERT INTO events (id, title, slug, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [id, title, slug, request.staff?.onyen],
    );
    response.status(201).json({ event: staffEvent(result.rows[0]) });
  }),
);

app.get(
  "/api/staff/events/:id",
  asyncRoute(async (request, response) => {
    const result = await pool.query("SELECT * FROM events WHERE id = $1 LIMIT 1", [
      request.params.id,
    ]);
    if (!result.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.patch(
  "/api/staff/events/:id",
  asyncRoute(async (request, response) => {
    const parsed = eventPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_event", issues: parsed.error.issues });
      return;
    }
    const entries = Object.entries(parsed.data);
    if (!entries.length) {
      response.status(400).json({ error: "no_changes" });
      return;
    }
    const existing = await pool.query("SELECT all_day FROM events WHERE id = $1 LIMIT 1", [
      request.params.id,
    ]);
    if (!existing.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    const allDay = parsed.data.allDay ?? Boolean(existing.rows[0].all_day);
    const columns: Record<string, string> = {
      title: "title",
      slug: "slug",
      summary: "summary",
      detailsMarkdown: "details_markdown",
      heroMediaId: "hero_media_id",
      startAtLocal: "start_at",
      endAtLocal: "end_at",
      allDay: "all_day",
      format: "event_format",
      location: "location",
      virtualUrl: "virtual_url",
      registrationUrl: "registration_url",
      contactEmail: "contact_email",
    };
    const nullableTextFields = new Set([
      "location",
      "virtualUrl",
      "registrationUrl",
      "contactEmail",
    ]);
    const values: unknown[] = [];
    for (const [key, value] of entries) {
      if (key === "startAtLocal" || key === "endAtLocal") {
        const boundary = key === "startAtLocal" ? "start" : "end";
        const converted = parseEventLocalBoundary(value as string | null, allDay, boundary);
        if (value && !converted) {
          response.status(400).json({ error: "invalid_event_date" });
          return;
        }
        values.push(converted);
      } else if (nullableTextFields.has(key)) {
        values.push(value || null);
      } else {
        values.push(value);
      }
    }
    const assignments = entries.map(
      ([key], index) => `${columns[key]} = $${index + 1}`,
    );
    values.push(request.staff?.onyen, String(request.params.id));
    try {
      const result = await pool.query(
        `UPDATE events
         SET ${assignments.join(", ")}, updated_by = $${values.length - 1}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING *`,
        values,
      );
      response.json({ event: staffEvent(result.rows[0]) });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        response.status(409).json({ error: "slug_in_use" });
        return;
      }
      throw error;
    }
  }),
);

app.post(
  "/api/staff/events/:id/publish",
  asyncRoute(async (request, response) => {
    const ready = await eventForPublication(String(request.params.id));
    if (!ready.row) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    if (ready.issue) {
      response.status(400).json({ error: "event_not_ready", message: ready.issue });
      return;
    }
    const result = await pool.query(
      `UPDATE events
       SET status = 'published', published_at = now(), publish_at = now(), archived_at = NULL,
           updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/events/:id/preview",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `UPDATE events
       SET status = 'preview', publish_at = NULL, archived_at = NULL,
           updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/events/:id/schedule",
  asyncRoute(async (request, response) => {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_schedule", issues: parsed.error.issues });
      return;
    }
    const ready = await eventForPublication(String(request.params.id));
    if (!ready.row) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    if (ready.issue) {
      response.status(400).json({ error: "event_not_ready", message: ready.issue });
      return;
    }
    const eastern = DateTime.fromISO(parsed.data.publishAtLocal, {
      zone: "America/New_York",
    });
    if (!eastern.isValid) {
      response.status(400).json({ error: "invalid_schedule" });
      return;
    }
    const when = eastern.toUTC().toJSDate();
    const publishNow = when.getTime() <= Date.now();
    const result = await pool.query(
      `UPDATE events
       SET status = $1, publish_at = $2,
           published_at = CASE WHEN $1 = 'published' THEN now() ELSE published_at END,
           archived_at = NULL, updated_by = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [publishNow ? "published" : "scheduled", when, request.staff?.onyen, request.params.id],
    );
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/events/:id/archive",
  asyncRoute(async (request, response) => {
    const result = await pool.query(
      `UPDATE events
       SET status = 'archived', archived_at = now(), is_featured = false,
           updated_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [request.staff?.onyen, request.params.id],
    );
    if (!result.rowCount) {
      response.status(404).json({ error: "event_not_found" });
      return;
    }
    response.json({ event: staffEvent(result.rows[0]) });
  }),
);

app.post(
  "/api/staff/events/:id/feature",
  asyncRoute(async (request, response) => {
    const parsed = eventFeatureSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_feature_change" });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query("SELECT * FROM events WHERE id = $1 LIMIT 1", [
        request.params.id,
      ]);
      if (!target.rowCount) {
        await client.query("ROLLBACK");
        response.status(404).json({ error: "event_not_found" });
        return;
      }
      let replacedFeaturedEvent: { id: string; title: string } | null = null;
      if (parsed.data.featured) {
        const currentFeatured = await client.query(
          "SELECT id, title FROM events WHERE is_featured = true AND id <> $1 LIMIT 1",
          [request.params.id],
        );
        if (currentFeatured.rowCount) {
          replacedFeaturedEvent = {
            id: String(currentFeatured.rows[0].id),
            title: String(currentFeatured.rows[0].title),
          };
        }
        await client.query(
          `UPDATE events
           SET is_featured = false, updated_by = $1, updated_at = now()
           WHERE is_featured = true AND id <> $2`,
          [request.staff?.onyen, request.params.id],
        );
      }
      const result = await client.query(
        `UPDATE events
         SET is_featured = $1, updated_by = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [parsed.data.featured, request.staff?.onyen, request.params.id],
      );
      await client.query("COMMIT");
      response.json({
        event: staffEvent(result.rows[0]),
        replacedFeaturedEvent,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.post(
  "/api/staff/media",
  upload.single("image"),
  asyncRoute(async (request, response) => {
    if (!request.file) {
      response.status(400).json({ error: "image_required" });
      return;
    }
    const id = randomUUID();
    await pool.query(
      `INSERT INTO update_media
       (id, file_name, mime_type, byte_size, content, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        request.file.originalname.slice(0, 240),
        request.file.mimetype,
        request.file.size,
        `\\x${request.file.buffer.toString("hex")}`,
        request.staff?.onyen,
      ],
    );
    response.status(201).json({
      media: { id, url: mediaUrl(id), fileName: request.file.originalname },
    });
  }),
);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    response.status(400).json({ error: "invalid_upload", message: error.message });
    return;
  }
  response.status(500).json({ error: "internal_server_error" });
});

initializeDatabase(auth.options)
  .then(() => {
    app.listen(config.port, "0.0.0.0", () => {
      console.info(`Updates API listening on http://0.0.0.0:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize updates database", error);
    process.exitCode = 1;
  });
