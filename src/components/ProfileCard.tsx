'use client'

interface ProfileCardProps {
  title: string
  children: React.ReactNode
  onEdit?: () => void
  className?: string
}

function ProfileField({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  const display = value ?? children ?? '—'
  const isStringPlaceholder =
    typeof display === 'string' && (display === '—' || display === 'Not added' || display === 'Not added yet')
  const isCustomNode = typeof display !== 'string'
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[var(--primary-hover)] text-sm font-medium shrink-0">{label}</span>
      <div
        className={`text-sm text-right min-w-0 ${isCustomNode ? '' : isStringPlaceholder ? 'text-slate-400 italic' : 'text-slate-900 font-medium'}`}
      >
        {display}
      </div>
    </div>
  )
}

export function ProfileCard({ title, children, onEdit, className }: ProfileCardProps) {
  return (
    <div className={`card p-6 profile-card-hover ${className ?? ''}`.trim()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 font-semibold text-sm">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-hover)] transition-colors"
            aria-label={`Edit ${title}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

export { ProfileField }
