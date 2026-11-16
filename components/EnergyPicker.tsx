'use client'

const LEVELS = [
  { value: 1, label: 'Drained' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Focused' },
  { value: 5, label: 'Peak' },
]

interface EnergyPickerProps {
  value: number | null
  onChange: (value: number | null) => void
}

/** Optional 1 to 5 energy rating. Tapping the selected level clears it. */
export default function EnergyPicker({ value, onChange }: EnergyPickerProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Energy <span className="normal-case font-normal text-gray-600">(optional)</span>
      </p>
      <div className="flex gap-2" role="group" aria-label="Energy level">
        {LEVELS.map(level => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(value === level.value ? null : level.value)}
            aria-pressed={value === level.value}
            aria-label={`${level.value} ${level.label}`}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              value === level.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 active:bg-gray-800'
            }`}
          >
            {level.value}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-1 h-4">
        {value ? LEVELS[value - 1].label : ''}
      </p>
    </div>
  )
}
