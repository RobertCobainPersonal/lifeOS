'use client'

import { useState } from 'react'
import { formatHour, formatMinutes, type HourRow } from '@/lib/record'

export interface HeatmapColumn {
  key: string
  label: string
}

const short = (label: string) => (label.length <= 5 ? label : `${label.slice(0, 4)}.`)

/** Five steps of one hue: more time, stronger fill. */
const STEPS = ['bg-card', 'bg-accent/15', 'bg-accent/35', 'bg-accent/60', 'bg-accent']

/** Hour of day against activity group. Shade shows minutes; tap a cell for the figure. */
export default function Heatmap({ grid, columns }: { grid: HourRow[]; columns: HeatmapColumn[] }) {
  const [picked, setPicked] = useState<{ hour: number; category: string } | null>(null)

  const labels = new Map(columns.map(c => [c.key, c.label]))
  const labelOf = (key: string) => labels.get(key) ?? key
  const categories = columns.map(c => c.key).filter(c => grid.some(row => (row.minutes[c] ?? 0) > 0))
  const active = grid.filter(row => Object.keys(row.minutes).length > 0).map(row => row.hour)
  if (categories.length === 0 || active.length === 0) return null

  // Show a continuous run of hours from the first to the last with any time
  const rows = grid.filter(row => row.hour >= Math.min(...active) && row.hour <= Math.max(...active))
  const max = Math.max(...rows.flatMap(row => categories.map(c => row.minutes[c] ?? 0)))
  const step = (minutes: number) =>
    minutes <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((minutes / max) * 4)))

  const pickedMinutes = picked ? grid[picked.hour].minutes[picked.category] ?? 0 : 0

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-[2px] text-xs">
        <caption className="sr-only">Minutes by hour of day and activity</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10 text-left font-normal text-faint">
              <span className="sr-only">Hour</span>
            </th>
            {categories.map(c => (
              <th key={c} scope="col" className="font-normal text-muted pb-1 text-[10px]" title={labelOf(c)}>
                <span aria-hidden="true">{short(labelOf(c))}</span>
                <span className="sr-only">{labelOf(c)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.hour}>
              <th scope="row" className="text-left font-normal text-faint tabular-nums pr-1">
                {formatHour(row.hour)}
              </th>
              {categories.map(c => {
                const minutes = row.minutes[c] ?? 0
                const isPicked = picked?.hour === row.hour && picked.category === c
                return (
                  <td key={c} className="p-0">
                    <button
                      type="button"
                      onClick={() => setPicked(isPicked ? null : { hour: row.hour, category: c })}
                      onMouseEnter={() => setPicked({ hour: row.hour, category: c })}
                      title={`${labelOf(c)}, ${formatHour(row.hour)}: ${formatMinutes(minutes)}`}
                      className={`block w-full h-6 rounded-[3px] ${STEPS[step(minutes)]} ${
                        isPicked ? 'ring-2 ring-ink' : minutes <= 0 ? 'ring-1 ring-line' : ''
                      }`}
                    >
                      <span className="sr-only">{formatMinutes(minutes)}</span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-sm text-ink-soft mt-3 min-h-[1.25rem]" aria-live="polite">
        {picked
          ? `${labelOf(picked.category)} at ${formatHour(picked.hour)}: ${formatMinutes(pickedMinutes)}`
          : 'Tap a square for the figure.'}
      </p>

      <div className="flex items-center gap-2 mt-2 text-xs text-faint">
        <span>Less</span>
        {STEPS.map(s => (
          <span key={s} className={`w-4 h-3 rounded-[2px] ${s} ${s === 'bg-card' ? 'ring-1 ring-line' : ''}`} />
        ))}
        <span>More · up to {formatMinutes(max)}</span>
      </div>
    </div>
  )
}
