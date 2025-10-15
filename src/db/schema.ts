import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  // Basic Information
  username: text("username").unique(),
  phoneNumber: text("phone_number"),
  dateOfBirth: text("date_of_birth"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  languagePreference: text("language_preference").default("en"),
  timezone: text("timezone"),
  // Personalization & Preferences
  themeMode: text("theme_mode").default("auto"),
  notificationPreferences: text("notification_preferences", { mode: "json" }),
  accessibilityOptions: text("accessibility_options", { mode: "json" }),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon'),
  type: text('type').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  description: text('description'),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  amount: real('amount').notNull(),
  period: text('period').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
});

export const aiInsights = sqliteTable('ai_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  data: text('data', { mode: 'json' }),
  priority: text('priority').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text('title').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  deadline: text('deadline'),
  category: text('category'),
  status: text('status').notNull().default('active'),
  priority: text('priority').notNull().default('medium'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const financialPersonality = sqliteTable('financial_personality', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }).unique(),
  personalityType: text('personality_type').notNull(),
  confidence: real('confidence').notNull(),
  traits: text('traits', { mode: 'json' }),
  lastUpdated: text('last_updated').notNull(),
  monthlyAnalysis: text('monthly_analysis', { mode: 'json' }),
});

export const sustainabilityScores = sqliteTable('sustainability_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  sustainabilityScore: real('sustainability_score').notNull(),
  ecoFriendlySpending: real('eco_friendly_spending').notNull(),
  carbonFootprint: text('carbon_footprint', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const riskScores = sqliteTable('risk_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: "cascade" }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  riskScore: real('risk_score').notNull(),
  incomeVolatility: real('income_volatility').notNull(),
  debtRatio: real('debt_ratio').notNull(),
  spendingVolatility: real('spending_volatility').notNull(),
  emergencyFundMonths: real('emergency_fund_months').notNull(),
  recommendations: text('recommendations', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});