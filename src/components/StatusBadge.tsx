import { type ReactNode } from "react"

export function StatusBadge({ children }: { children: ReactNode }) {
  const value = String(children).toLowerCase().replace(" ", "-")
  return <span className={`badge badge-${value}`}>{children}</span>
}
