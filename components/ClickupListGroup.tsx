export interface ClickupTask {
  clickup_id: string
  title: string
  status: string | null
  due_date: string | null
  url: string
  pinned_top3_date: string | null
}

interface ClickupListGroupProps {
  listName: string
  tasks: ClickupTask[]
  today: string
  expanded: boolean
  onToggle: () => void
}

export default function ClickupListGroup({
  listName,
  tasks,
  today,
  expanded,
  onToggle,
}: ClickupListGroupProps) {
  return (
    <section className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-2 active:opacity-70 transition-opacity"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {listName}
        </span>
        <span className="flex items-center gap-2 text-gray-600 text-xs">
          <span>{tasks.length}</span>
          <span>{expanded ? '↑' : '↓'}</span>
        </span>
      </button>

      {expanded && (
        <div className="bg-gray-900 rounded-xl divide-y divide-gray-800">
          {tasks.map(task => {
            const isOverdue = task.due_date && task.due_date < today
            const isPinnedToday = task.pinned_top3_date === today

            return (
              <div key={task.clickup_id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-sm leading-snug hover:underline"
                  >
                    {task.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.status && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {task.status}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                        {isOverdue ? 'overdue · ' : ''}{task.due_date}
                      </span>
                    )}
                    {isPinnedToday && (
                      <span className="text-yellow-400 text-xs">★ Top 3</span>
                    )}
                  </div>
                </div>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 active:text-gray-400 text-sm shrink-0 mt-0.5"
                  aria-label="Open in ClickUp"
                >
                  ↗
                </a>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
