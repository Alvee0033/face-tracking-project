import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatSalary(min?: number, max?: number, currency: string = 'USD'): string {
  if (!min && !max) return 'Not disclosed'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }
  
  return formatter.format(min || max!)
}

