import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/transactions-client'

export const revalidate = 60

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('executed_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          Full history of your trades and transfers
        </p>
      </div>
      <TransactionsClient
        transactions={transactions ?? []}
        userId={user!.id}
      />
    </div>
  )
}
