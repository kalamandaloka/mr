"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { getAccessToken } from "../lib/api"
import "./globals.css"

export default function RootLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = getAccessToken()
    const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/")
    if (!token && !isLoginRoute) {
      router.replace("/login")
    }
    if (token && isLoginRoute) {
      router.replace("/dashboard")
    }
  }, [pathname, router])

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/modules", label: "Modules" },
    { href: "/scenes", label: "Scenes" },
    { href: "/assets", label: "Assets" },
    { href: "/content-blocks", label: "Content Blocks" },
    { href: "/interactions", label: "Interactions" },
    { href: "/evaluations", label: "Evaluations" },
    { href: "/analytics", label: "Analytics" },
    { href: "/publish", label: "Publish" },
  ]

  const isLogin = pathname === "/login" || pathname.startsWith("/login/")

  return (
    <html lang="id">
      <body>
        {isLogin ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <aside className="w-72 shrink-0 border-r border-cyan-200/10 bg-sky-950/10">
              <div className="flex h-full flex-col px-4 py-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-400/10 text-cyan-100">
                    NX
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">NalarXR</div>
                    <div className="text-xs text-slate-100/60">Web Admin</div>
                  </div>
                </div>

                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          "rounded-xl border px-3 py-2 text-sm",
                          active
                            ? "border-cyan-200/20 bg-cyan-400/10 text-cyan-100"
                            : "border-transparent text-slate-100/80 hover:border-cyan-200/10 hover:bg-sky-950/20 hover:text-slate-100",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>

                <div className="mt-auto pt-5">
                  <div className="rounded-2xl border border-cyan-200/10 bg-sky-950/20 p-3">
                    <div className="text-xs text-slate-100/60">Signed in</div>
                    <div className="mt-0.5 text-sm font-medium text-slate-100">admin</div>
                    <button
                      className="mt-3 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-sm text-cyan-100 hover:bg-sky-950/40"
                      onClick={() => {
                        window.localStorage.removeItem("nalarxr_access_token")
                        document.cookie = "nalarxr_access_token=; Path=/; Max-Age=0; SameSite=Lax"
                        window.location.assign("/login")
                      }}
                      type="button"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <main className="flex-1">{children}</main>
          </div>
        )}
      </body>
    </html>
  )
}
