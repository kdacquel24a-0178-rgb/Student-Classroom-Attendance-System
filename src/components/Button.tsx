import { type ReactNode } from "react"

export function Button({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button className={`button ${className}`} onClick={onClick} type="button">
      {children}
    </button>
  )
}
