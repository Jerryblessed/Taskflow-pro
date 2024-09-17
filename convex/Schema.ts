import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    todos: defineTable({ text: v.string() }),   


    users: defineTable({ tokenIdentifier: v.string(), name: v.string()}),
});