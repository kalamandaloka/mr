import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { env } from "./env"

const JwtPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["ADMIN", "STUDENT"]),
})

export type JwtPayload = z.infer<typeof JwtPayloadSchema>

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  })
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] })
  const parsed = JwtPayloadSchema.safeParse(decoded)
  if (!parsed.success) {
    throw new Error("Invalid token payload")
  }
  return parsed.data
}
