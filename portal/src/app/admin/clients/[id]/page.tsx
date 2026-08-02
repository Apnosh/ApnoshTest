import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAdminClientById } from '@/lib/supabase/crm-queries'
import ClientDetailView from './client-detail-view'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const row = await getAdminClientById(id)

  if (!row) {
    return (
      <div className="max-w-6xl mx-auto">
        <Link href="/admin/clients" className="inline-flex items-center gap-2 text-ink-4 hover:text-ink text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </Link>
        <div className="bg-white rounded-xl border border-ink-6 p-12 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-xl text-ink mb-2">Client not found</h1>
          <p className="text-sm text-ink-4">
            No account record for id <code className="font-mono text-xs bg-bg-2 px-1.5 py-0.5 rounded">{id}</code>.
          </p>
          <p className="text-sm text-ink-4 mt-2">
            If you just ran the migration, make sure you seeded clients (see{' '}
            <code className="font-mono text-xs">portal/supabase/seed.sql</code>).
          </p>
        </div>
      </div>
    )
  }

  return <ClientDetailView account={row.account} business={row.business} />
}
