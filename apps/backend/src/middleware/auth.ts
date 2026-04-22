import type { NextFunction, Request, Response } from "express"
import { verifyAccessToken, type JwtPayload } from "../auth"

export type AuthenticatedRequest = Request & { auth?: JwtPayload }

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  if (!header) {
    res.status(401).json({ error: "Missing Authorization header" })
    return
  }

  const [scheme, token] = header.split(" ")
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Invalid Authorization header" })
    return
  }

  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.auth?.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" })
    return
  }
  next()
}
