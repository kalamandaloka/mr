"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <GlassPanel title="Login Admin">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            setError(null)
            try {
              const result = await apiFetch<{
                accessToken: string
                user: { id: string; name: string; email: string; role: string }
              }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email: identifier, password }),
              })
              if (!result.ok) {
                setError(result.error)
                return
              }
              window.localStorage.setItem("nalarxr_access_token", result.data.accessToken)
              const maxAgeSeconds = 60 * 60 * 24 * 7
              document.cookie = `nalarxr_access_token=${encodeURIComponent(result.data.accessToken)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
              window.location.assign("/dashboard")
            } catch (err) {
              const message = err instanceof Error ? err.message : "Login failed"
              setError(message)
            } finally {
              setLoading(false)
            }
          }}
        >
          <label className="text-sm text-cyan-100/90">
            Username / Email
            <input
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin"
              required
            />
          </label>
          <label className="text-sm text-cyan-100/90">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <div className="text-sm text-rose-200">{error}</div> : null}
          <button
            disabled={loading}
            className="mt-2 rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
      </GlassPanel>
    </main>
  )
}
