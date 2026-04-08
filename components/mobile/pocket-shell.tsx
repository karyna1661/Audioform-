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
    <main className={cn("af-shell min-h-dvh bg-[#f3ecdf] px-3 pb-20 pt-3", className)}>
      <section className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col rounded-[1.65rem] border border-[#dbcdb8]/70 bg-[#f8f1e6] shadow-[0_16px_32px_rgba(86,57,25,0.08),inset_0_1px_0_rgba(255,255,255,0.55)]">
        <header className="border-b border-[#e2d4be]/65 px-4 pb-3.5 pt-4.5">
          {eyebrow ? (
            <p className="font-body text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8a431f]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1.5 max-w-[13ch] text-[1.6rem] font-semibold leading-[0.98] tracking-[-0.03em] text-[var(--af-color-primary)] text-balance">
            {title}
          </h1>
          {description ? (
            <p className="font-body mt-2 max-w-[31ch] text-[0.84rem] leading-5 text-[#5c5146] text-pretty">
              {description}
            </p>
          ) : null}
        </header>
        <div className="flex-1 px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[#e2d4be]/65 bg-[#fff8f0]/92 px-4 py-3 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
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
    <section className={cn("rounded-[1.15rem] border border-[#dbcdb8]/55 bg-[#fffdf8] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]", className)}>
      {title ? <h2 className="text-[0.95rem] font-semibold leading-5 text-[var(--af-color-primary)]">{title}</h2> : null}
      {description ? (
        <p className="font-body mt-1 max-w-[34ch] text-[0.8rem] leading-5 text-[#5c5146] text-pretty">{description}</p>
      ) : null}
      <div className={cn(title || description ? "mt-2.5" : "")}>{children}</div>
    </section>
  )
}

export function PocketActionStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-1.5", className)}>{children}</div>
}

type MobilePageProps = {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export function MobilePage({
  eyebrow,
  title,
  description,
  children,
  action,
  className,
}: MobilePageProps) {
  return (
    <main className={cn("af-shell min-h-dvh bg-[#f3ecdf] px-4 pb-28 pt-5", className)}>
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a431f]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-[2rem] font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--af-color-primary)]">
              {title}
            </h1>
            {description ? (
              <p className="font-body mt-2 max-w-[30ch] text-[0.9rem] leading-5 text-[#5c5146]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0 pt-1">{action}</div> : null}
        </header>

        <div className="mt-6 space-y-6">{children}</div>
      </div>
    </main>
  )
}

export function MobileSection({
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
    <section className={className}>
      {title ? <h2 className="text-[1.3rem] font-semibold leading-tight text-[var(--af-color-primary)]">{title}</h2> : null}
      {description ? (
        <p className="font-body mt-1 max-w-[34ch] text-[0.84rem] leading-5 text-[#5c5146]">{description}</p>
      ) : null}
      <div className={cn(title || description ? "mt-2.5" : "")}>{children}</div>
    </section>
  )
}
