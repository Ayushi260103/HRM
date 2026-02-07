'use client'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({ children, className = '', padding = 'lg' }: CardProps) {
  return (
    <div
      className={`card transition-shadow transition-colors duration-150 ease-out ${paddingMap[padding]} ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}
