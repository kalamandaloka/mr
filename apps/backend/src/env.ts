import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().optional(),
})

export const env = EnvSchema.parse(process.env)

