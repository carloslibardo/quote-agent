import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database Schema
 *
 * This file defines the structure of your Convex database tables.
 * Each table is defined with its fields and their types.
 *
 * Add your own tables here following the same pattern.
 */

export default defineSchema({
  // Example: Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
  })
    .index("by_email", ["email"]),
});
