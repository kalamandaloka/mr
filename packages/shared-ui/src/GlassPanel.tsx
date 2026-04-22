import type { ReactNode } from "react"

export function GlassPanel({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-cyan-200/25 bg-sky-950/35 backdrop-blur-md",
        "shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_8px_28px_rgba(0,0,0,0.35)]",
        "text-slate-100",
        className ?? "",
      ].join(" ")}
    >
      {title ? (
        <div className="border-b border-cyan-200/15 px-4 py-3">
          <div className="text-xs font-semibold tracking-wider text-cyan-100/90">
            {title}
          </div>
        </div>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

