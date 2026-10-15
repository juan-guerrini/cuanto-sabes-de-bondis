import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const questions = sqliteTable('questions', {
 id: text('id').primaryKey(), country: text('country').notNull(), prompt: text('prompt').notNull(), options: text('options').notNull(), correct: integer('correct').notNull(), difficulty: text('difficulty').notNull(), category: text('category').notNull().default('General'), explanation: text('explanation').notNull().default(''), active: integer('active').notNull().default(1), authorEmail: text('author_email').notNull().default(''), authorName: text('author_name').notNull().default('Juan')
});
export const settings = sqliteTable('settings', {id: text('id').primaryKey(), value: text('value').notNull()});

export const contributors = sqliteTable('contributors', { email: text('email').primaryKey(), name: text('name').notNull(), active: integer('active').notNull().default(1) });

export const accounts = sqliteTable('accounts', {
 id:text('id').primaryKey(), username:text('username').notNull().unique(), name:text('name').notNull(), email:text('email').unique(), password:text('password').notNull(), role:text('role').notNull().default('player'), active:integer('active').notNull().default(1), points:integer('points').notNull().default(0), attempts:integer('attempts').notNull().default(0), hits:integer('hits').notNull().default(0), createdAt:integer('created_at').notNull(), mustChangePassword:integer('must_change_password').notNull().default(1)
});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),accountId:text('account_id').notNull(),expires:integer('expires').notNull()});
export const answers=sqliteTable('answers',{id:text('id').primaryKey(),accountId:text('account_id').notNull(),questionId:text('question_id').notNull(),correct:integer('correct').notNull().default(0)});
export const recoveries=sqliteTable('recoveries',{id:text('id').primaryKey(),accountId:text('account_id').notNull(),requested:integer('requested').notNull(),token:text('token'),expires:integer('expires'),used:integer('used').notNull().default(0)});
export const rewardClaims=sqliteTable('reward_claims',{id:text('id').primaryKey(),rewardId:text('reward_id').notNull(),accountId:text('account_id').notNull(),createdAt:integer('created_at').notNull(),status:text('status').notNull().default('pending'),coupon:text('coupon').notNull().default('')});
export const throttles=sqliteTable('throttles',{id:text('id').primaryKey(),count:integer('count').notNull().default(0),expires:integer('expires').notNull()});
