import { useState } from 'react'
import {
  Button, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography,
} from '@mui/material'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, Mono, NoteDialog, PageHeader, StatusChip, short, useAction, useLoad, when } from '../components/common'

type Transfer = {
  id: number; chain: string; method_id: string; tx_hash: string; tx_url?: string; amount: string; asset: string; network: string
  from_address: string; block_time: string; confirmations: number; status: string; invoice_id?: string
}

export default function Transfers() {
  const { can } = useAuth()
  const { run } = useAction()
  const [status, setStatus] = useState('unmatched')
  const [page, setPage] = useState(0)
  const [assign, setAssign] = useState<Transfer | null>(null)
  const [invoiceId, setInvoiceId] = useState('')
  const { data, error, loading, reload } = useLoad(
    () => get<{ transfers: Transfer[]; total: number }>(`/transfers?status=${status}&page=${page + 1}&per_page=25`),
    [status, page],
  )

  return (
    <>
      <PageHeader title="Transfers" subtitle="Everything the chain watchers saw arriving at your addresses. Unmatched ones did not fit any open invoice." />
      <TextField size="small" select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} sx={{ mb: 2, minWidth: 180 }}>
        {['unmatched', 'review', 'matched', 'credited', 'ignored', 'all'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Seen</TableCell><TableCell>Amount</TableCell><TableCell>Network</TableCell><TableCell>From</TableCell><TableCell>Transaction</TableCell><TableCell>Status</TableCell><TableCell /></TableRow>
              </TableHead>
              <TableBody>
                {data?.transfers.length === 0 && <EmptyRow cols={7} text="Nothing here." />}
                {data?.transfers.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{when(t.block_time)}</TableCell>
                    <TableCell><b>{t.amount}</b> {t.asset}</TableCell>
                    <TableCell>{t.network}</TableCell>
                    <TableCell><Mono>{short(t.from_address)}</Mono></TableCell>
                    <TableCell>{t.tx_url ? <Link href={t.tx_url} target="_blank" rel="noreferrer"><Mono>{short(t.tx_hash)}</Mono></Link> : <Mono>{short(t.tx_hash)}</Mono>}</TableCell>
                    <TableCell><StatusChip status={t.status} /></TableCell>
                    <TableCell align="right">
                      {can('billing.write') && (t.status === 'unmatched' || t.status === 'review') && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => { setInvoiceId(t.invoice_id ?? ''); setAssign(t) }}>Assign</Button>
                          <Button size="small" color="inherit" onClick={() => run(() => post(`/transfers/${t.id}/ignore`), 'Transfer ignored').then((ok) => { if (ok) reload() })}>Ignore</Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPage(p)} />
        </Paper>
      )}
      <NoteDialog
        open={!!assign}
        title="Assign transfer to an invoice"
        text={assign ? `${assign.amount} ${assign.asset} on ${assign.network}. The invoice is credited and its plan granted.` : ''}
        confirm="Assign and credit"
        extra={(
          <>
            <TextField fullWidth label="Invoice id" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value.trim())} sx={{ mb: 1 }} helperText="Find it under Payments (search by the user's email)." />
            <Typography variant="caption" color="text.secondary">The invoice must use the same token and network as the transfer.</Typography>
          </>
        )}
        onClose={() => setAssign(null)}
        onConfirm={async (note) => {
          if (invoiceId.length !== 36) return false
          const ok = await run(() => post(`/transfers/${assign!.id}/assign`, { invoice_id: invoiceId, note }), 'Transfer assigned and invoice credited')
          if (ok) reload()
          return ok
        }}
      />
    </>
  )
}
