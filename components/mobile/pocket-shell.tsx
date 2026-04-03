"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PocketShellProps = {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function PocketShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
}: PocketShellProps) {
  return (
    <main className={cn("af-shell min-h-dvh bg-[#f3ecdf] px-3 py-3", className)}>
      <section className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col rounded-[1.75rem] border border-[#dbcdb8] bg-[#f9f4ea] shadow-[0_16px_40px_rgba(86,57,25,0.10)]">
        <header className="border-b border-[#e2d4be] px-4 pb-4 pt-5">
          {eyebrow ? (
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a6146]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-[1.75rem] font-semibold leading-[1.02] text-[var(--af-color-primary)] text-balance">
            {title}
          </h1>
          {description ? (
            <p className="font-body mt-2 text-sm leading-6 text-[#5c5146] text-pretty">
              {description}
            </p>
          ) : null}
        </header>
        <div className="flex-1 px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[#e2d4be] bg-[#fff8f0] px-4 py-3 [padding-bottom:calc(env(safe-area-inset-bottom)+0.9rem)]">
            {footer}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export function PocketSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[1.35rem] border border-[#dbcdb8] bg-[#fffaf4] p-4", className)}>
      {title ? <h2 className="text-base font-semibold text-[var(--af-color-primary)]">{title}</h2> : null}
      {description ? (
        <p className="font-body mt-1 text-sm leading-6 text-[#5c5146] text-pretty">{description}</p>
      ) : null}
      <div className={cn(title || description ? "mt-3" : "")}>{children}</div>
    </section>
  )
}

export function PocketActionStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-2", className)}>{children}</div>
}
