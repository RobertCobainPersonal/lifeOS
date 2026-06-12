import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CaptureCard from '@/components/CaptureCard'
import BottomNav from '@/components/BottomNav'

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: captures, error } = await supabase
    .from('captures')
    .select('id, raw_text, source, url, created_at')
    .is('triaged_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  const inboxCount = captures?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-1">Inbox</h1>
        <p className="text-gray-500 text-sm mb-6">
          {inboxCount === 0 ? 'All clear' : `${inboxCount} to triage`}
        </p>

        {inboxCount === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-base">Nothing to triage.</p>
            <p className="text-gray-700 text-sm mt-1">
              New captures appear here after you add them.
            </p>
          </div>
        ) : (
          captures!.map(capture => (
            <CaptureCard
              key={capture.id}
              id={capture.id}
              rawText={capture.raw_text}
              createdAt={capture.created_at}
              source={capture.source}
              url={capture.url}
            />
          ))
        )}
      </div>

      <BottomNav current="inbox" inboxCount={inboxCount} />
    </div>
  )
}
