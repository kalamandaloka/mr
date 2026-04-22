const defaultBaseUrl = "http://localhost:4000"

export function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL
  if (configured) return configured
  if (typeof window !== "undefined") {
    return ""
  }
  return defaultBaseUrl
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null
  const prefix = `${encodeURIComponent(name)}=`
  const parts = document.cookie.split(";").map((p) => p.trim())
  for (const part of parts) {
    if (!part.startsWith(prefix)) continue
    const value = part.slice(prefix.length)
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return null
}

export function getAccessToken() {
  if (typeof window === "undefined") return null
  const fromStorage = window.localStorage.getItem("nalarxr_access_token")
  if (fromStorage) return fromStorage
  const fromCookie = readCookie("nalarxr_access_token")
  return fromCookie
}

export function authHeader() {
  if (typeof window === "undefined") return {}
  const token = getAccessToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const headers = new Headers(init?.headers)
  const body = init?.body
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData
  if (!headers.has("Content-Type") && body != null && !isFormData) {
    headers.set("Content-Type", "application/json")
  }
  const auth = authHeader()
  if ("Authorization" in auth && auth.Authorization) {
    headers.set("Authorization", auth.Authorization)
  }

  let res: Response
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    return { ok: false, error: message, status: 0 }
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (json?.error) return { ok: false, error: json.error, status: res.status }
    }
    const text = await res.text().catch(() => "")
    return { ok: false, error: text || res.statusText, status: res.status }
  }

  if (res.status === 204) {
    return { ok: true, data: undefined as T }
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "")
    return { ok: true, data: text as unknown as T }
  }

  const data = (await res.json()) as T
  return { ok: true, data }
}
