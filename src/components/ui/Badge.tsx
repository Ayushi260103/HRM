'use client'

type BadgeVariant = 'approved' | 'pending' | 'rejected' | 'info' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  approved: 'badge-common badge-approved',
  pending: 'badge-common badge-pending',
  rejected: 'badge-common badge-rejected',
  info: 'badge-common badge-info',
  neutral:
    'badge-common inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200',
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
