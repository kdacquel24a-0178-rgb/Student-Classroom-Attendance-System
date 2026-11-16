import { ButtonHTMLAttributes, ReactNode } from "react"

// Extending ButtonHTMLAttributes allows the component to accept 'disabled', 'type', etc.
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

export function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button 
      className={`btn ${className}`} // Adjust 'btn' to match your default styling class if you have one
      {...props} // This automatically passes down 'disabled', 'onClick', etc.
    >
      {children}
    </button>
  )
}