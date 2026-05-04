import dotenv from "dotenv"
import crypto from "node:crypto"
import { z } from "zod"

dotenv.config()

const BaseSchema = z.object({
  PORT: z.coerce.number().int().positive().optional(),
  CORS_ORIGIN: z.string().optional(),
})

const ProdSchema = BaseSchema.extend({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
})

const DevSchema = BaseSchema.extend({
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16).optional(),
})

const isProd = process.env.NODE_ENV === "production"
const parsed = (isProd ? ProdSchema : DevSchema).parse(process.env)

export const env = {
  ...parsed,
  JWT_SECRET: parsed.JWT_SECRET ?? crypto.randomBytes(32).toString("hex"),
}

