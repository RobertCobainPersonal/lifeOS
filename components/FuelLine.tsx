import Link from 'next/link'

interface FuelLineProps {
  kcal: number
  protein: number
  kcalTarget: number | null
  proteinTarget: number | null
}

const fmt = (n: number) => n.toLocaleString('en-GB')

/** Today's food against target. Neutral at every value, including over target. */
export default function FuelLine({ kcal, protein, kcalTarget, proteinTarget }: FuelLineProps) {
  return (
    <Link
      href="/fuel"
      className="mb-6 flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
    >
      <span className="text-sm text-ink-soft">
        <span className="text-muted">Fuel</span>{' '}
        <span className="tabular-nums">
          {fmt(kcal)}
          {kcalTarget ? ` / ${fmt(kcalTarget)}` : ''} kcal · {protein}
          {proteinTarget ? ` / ${proteinTarget}` : ''} g
        </span>
      </span>
      <span className="text-accent-ink text-lg leading-none" aria-label="Log food">
        +
      </span>
    </Link>
  )
}
