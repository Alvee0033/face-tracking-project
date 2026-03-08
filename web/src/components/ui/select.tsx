import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, style, onValueChange, onChange, ...props }, ref) => {
    const [isDark, setIsDark] = React.useState(false)

    React.useEffect(() => {
      // Check if dark mode is active
      const checkDarkMode = () => {
        setIsDark(document.documentElement.classList.contains('dark'))
      }

      checkDarkMode()

      // Watch for changes
      const observer = new MutationObserver(checkDarkMode)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })

      return () => observer.disconnect()
    }, [])

    return (
      <div className="relative">
        <select
          className={cn(
            // Base styles
            "flex h-10 w-full rounded-lg border-2 px-3 py-2 pr-10 text-sm font-medium shadow-sm transition-all appearance-none cursor-pointer",
            // Hover states
            "hover:border-muted-foreground/40",
            // Focus states
            "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:border-teal-600",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          style={{
            backgroundColor: isDark ? '#17141f' : 'rgba(244, 242, 251, 0.48)',
            borderColor: isDark ? '#2d2733' : '#dcd6f0',
            color: isDark ? '#f2f1f5' : '#171a26',
            colorScheme: isDark ? 'dark' : 'light',
            ...style
          }}
          ref={ref}
          onChange={(e) => {
            if (onValueChange) {
              onValueChange(e.target.value)
            }
            if (onChange) {
              onChange(e)
            }
          }}
          {...props}
        >
          {children}
        </select>
        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
          <svg
            className="h-4 w-4 transition-colors"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{
              color: isDark ? '#969199' : '#656d81'
            }}
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }

// CountrySelect: standardized country dropdown
export function CountrySelect({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Select {...props}>
      <option value="">Select country</option>
      {options.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </Select>
  )
}