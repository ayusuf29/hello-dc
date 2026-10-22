import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const platformEnum = pgEnum("platform", ["x", "threads"]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "approved",
  "rejected",
  "needs_info",
]);

export const postStatusEnum = pgEnum("post_status", ["published", "archived"]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_for_user",
  "resolved",
]);

export const attachmentOwnerEnum = pgEnum("attachment_owner", [
  "consultation_message",
  "report",
]);

export const adminRoleEnum = pgEnum("admin_role", ["admin", "moderator"]);

export const senderTypeEnum = pgEnum("sender_type", ["user", "admin"]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredOrder: integer("featured_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("merchants_slug_uq").on(t.slug),
    index("merchants_featured_idx").on(t.isFeatured, t.featuredOrder),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    platform: platformEnum("platform").notNull(),
    sourceUrl: text("source_url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: varchar("title", { length: 250 }),
    summary: text("summary"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    status: postStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("posts_canonical_url_uq").on(t.canonicalUrl),
    index("posts_timeline_idx").on(t.status, t.createdAt, t.id),
    index("posts_merchant_timeline_idx").on(
      t.merchantId,
      t.status,
      t.createdAt,
      t.id
    ),
  ]
);

// Declared before reports so foreign key references cleanly
export const reportInvites = pgTable(
  "report_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeHash: text("code_hash").notNull(),
    code: varchar("code", { length: 50 }),
    label: varchar("label", { length: 150 }),
    phoneNumber: varchar("phone_number", { length: 30 }),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("report_invite_hash_uq").on(t.codeHash),
    index("report_invite_phone_idx").on(t.phoneNumber, t.createdAt),
  ]
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    postId: uuid("post_id").references(() => posts.id),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => reportInvites.id),
    platform: platformEnum("platform").notNull(),
    sourceUrl: text("source_url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("pending"),
    moderatorNote: text("moderator_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_status_created_idx").on(t.status, t.createdAt),
    index("reports_canonical_url_idx").on(t.canonicalUrl),
  ]
);

export const reporterSessions = pgTable(
  "reporter_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => reportInvites.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reporter_session_token_uq").on(t.tokenHash),
    index("reporter_sessions_invite_idx").on(t.inviteId),
  ]
);

export const consultationTickets = pgTable(
  "consultation_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: varchar("subject", { length: 200 }).notNull(),
    contactName: varchar("contact_name", { length: 150 }),
    contactEmail: varchar("contact_email", { length: 254 }).notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("consultation_access_token_uq").on(t.accessTokenHash),
    index("consultation_status_updated_idx").on(t.status, t.lastMessageAt),
  ]
);

export const consultationMessages = pgTable(
  "consultation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => consultationTickets.id, { onDelete: "cascade" }),
    senderType: senderTypeEnum("sender_type").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("consultation_messages_timeline_idx").on(
      t.ticketId,
      t.createdAt,
      t.id
    ),
  ]
);

export const mediaAttachments = pgTable(
  "media_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: attachmentOwnerEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("attachments_owner_idx").on(t.ownerType, t.ownerId),
  ]
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 150 }),
    role: adminRoleEnum("role").notNull().default("moderator"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_users_email_uq").on(t.email),
  ]
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_session_token_uq").on(t.tokenHash),
    index("admin_sessions_admin_idx").on(t.adminId),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id"),
    actorType: varchar("actor_type", { length: 50 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 100 }).notNull(),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorType, t.actorId),
    index("audit_logs_action_idx").on(t.action, t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const merchantsRelations = relations(merchants, ({ many }) => ({
  posts: many(posts),
  reports: many(reports),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [posts.merchantId],
    references: [merchants.id],
  }),
  reports: many(reports),
}));

export const reportInvitesRelations = relations(reportInvites, ({ many }) => ({
  reports: many(reports),
  sessions: many(reporterSessions),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  merchant: one(merchants, {
    fields: [reports.merchantId],
    references: [merchants.id],
  }),
  post: one(posts, {
    fields: [reports.postId],
    references: [posts.id],
  }),
  invite: one(reportInvites, {
    fields: [reports.inviteId],
    references: [reportInvites.id],
  }),
}));

export const consultationTicketsRelations = relations(
  consultationTickets,
  ({ many }) => ({
    messages: many(consultationMessages),
  })
);

export const consultationMessagesRelations = relations(
  consultationMessages,
  ({ one }) => ({
    ticket: one(consultationTickets, {
      fields: [consultationMessages.ticketId],
      references: [consultationTickets.id],
    }),
  })
);

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminSessions.adminId],
    references: [adminUsers.id],
  }),
}));

// ---------------------------------------------------------------------------
// TypeScript Inference Types
// ---------------------------------------------------------------------------

export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type ReportInvite = typeof reportInvites.$inferSelect;
export type NewReportInvite = typeof reportInvites.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type ReporterSession = typeof reporterSessions.$inferSelect;
export type NewReporterSession = typeof reporterSessions.$inferInsert;

export type ConsultationTicket = typeof consultationTickets.$inferSelect;
export type NewConsultationTicket = typeof consultationTickets.$inferInsert;

export type ConsultationMessage = typeof consultationMessages.$inferSelect;
export type NewConsultationMessage = typeof consultationMessages.$inferInsert;

export type MediaAttachment = typeof mediaAttachments.$inferSelect;
export type NewMediaAttachment = typeof mediaAttachments.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
