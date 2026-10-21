import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import {
  Alert, Box, Button, Divider, Drawer, IconButton, InputAdornment, Link, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, Mono, NoteDialog, PageHeader, StatusChip, short, useAction, useLoad, when } from '../components/common'

export type InvoiceRow = {
  id: string; status: string; user_id: number; user_email: string
  plan: { id: string; name: string; price_usd: string }
  method: { id: string; asset: string; network: string; chain: string }
  address: string; amount: string; amount_units: string; amount_usd: string; rate_usd: number
  expires_at: string; created_at: string; paid_at?: string; tx_hash?: string; tx_url?: string; received?: string
  confirmations: number; required_confirmations: number; premium_until?: string; note?: string
}
type Transfer = { id: number; chain: string; tx_hash: string; tx_url?: string; amount: string; asset: string; network: string; from_address: string; block_time: string; confirmations: number; status: string; invoice_id?: string }

const statuses = ['', 'review', 'pending', 'confirming', 'paid', 'expired', 'cancelled', 'rejected']
const chains = ['', 'tron', 'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'solana', 'bitcoin']

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const chain = params.get('chain') ?? ''
  const search = params.get('q') ?? ''
  const [q, setQ] = useState(search)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p); setPage(0) }

  const { data, error, loading, reload } = useLoad(
    () => get<{ invoices: InvoiceRow[]; total: number }>(`/invoices?page=${page + 1}&per_page=25&status=${status}&chain=${chain}&q=${encodeURIComponent(search)}`),
    [page, status, chain, search],
  )

  return (
    <>
      <PageHeader title="Payments" subtitle="Crypto invoices. Payments in review need a decision: credit or reject." />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Email, transaction hash or invoice id" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') set('q', q.trim()) }} sx={{ minWidth: 320 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        <TextField size="small" select label="Status" value={status} onChange={(e) => set('status', e.target.value)} sx={{ minWidth: 160 }}>
          {statuses.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Chain" value={chain} onChange={(e) => set('chain', e.target.value)} sx={{ minWidth: 160 }}>
          {chains.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Created</TableCell><TableCell>User</TableCell><TableCell>Plan</TableCell><TableCell>Amount</TableCell>
                  <TableCell>Network</TableCell><TableCell>Status</TableCell><TableCell>Transaction</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.invoices.length === 0 && <EmptyRow cols={7} text="No invoices match." />}
                {data?.invoices.map((i) => (
                  <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(i.id)}>
                    <TableCell>{when(i.created_at)}</TableCell>
                    <TableCell>{i.user_email}</TableCell>
                    <TableCell>{i.plan?.name}</TableCell>
                    <TableCell>{i.amount} {i.method?.asset} <Typography component="span" variant="caption" color="text.secondary">${i.amount_usd}</Typography></TableCell>
                    <TableCell>{i.method?.network}</TableCell>
                    <TableCell><StatusChip status={i.status} /></TableCell>
                    <TableCell><Mono>{short(i.tx_hash)}</Mono></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPage(p)} />
        </Paper>
      )}
      <InvoiceDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ minWidth: 0, wordBreak: 'break-all' }}>{children}</Box>
    </Stack>
  )
}

function InvoiceDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth()
  const { run } = useAction()
  const [dialog, setDialog] = useState<'credit' | 'reject' | null>(null)
  const { data, error, loading, reload } = useLoad(
    () => (id ? get<{ invoice: InvoiceRow; transfers: Transfer[] }>(`/invoices/${id}`) : Promise.resolve(null)),
    [id],
  )
  const inv = data?.invoice
  const decidable = inv && inv.status !== 'paid' && inv.status !== 'rejected'

  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Invoice</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading || !inv ? <Loading /> : (
        <>
          {inv.status === 'review' && (
            <Alert severity="warning" sx={{ my: 2 }}>
              The payer claimed a transaction that does not match the invoice exactly. Check it on the explorer, then credit or reject.
            </Alert>
          )}
          <Row label="Status"><StatusChip status={inv.status} /></Row>
          <Row label="Invoice"><Mono>{inv.id}</Mono></Row>
          <Row label="User"><Link component={RouterLink} to={`/users/${inv.user_id}`} onClick={onClose}>{inv.user_email}</Link></Row>
          <Row label="Plan">{inv.plan?.name} (${inv.plan?.price_usd})</Row>
          <Row label="Amount asked">{inv.amount} {inv.method?.asset} on {inv.method?.network}{inv.rate_usd !== 1 && ` at $${inv.rate_usd.toLocaleString()}`}</Row>
          {inv.received && <Row label="Received">{inv.received} {inv.method?.asset}</Row>}
          <Row label="Address"><Mono>{inv.address}</Mono></Row>
          <Row label="Created">{when(inv.created_at)}</Row>
          <Row label="Expires">{when(inv.expires_at)}</Row>
          {inv.paid_at && <Row label="Paid">{when(inv.paid_at)}</Row>}
          {inv.premium_until && <Row label="Premium until">{when(inv.premium_until)}</Row>}
          {inv.tx_hash && <Row label="Transaction">{inv.tx_url ? <Link href={inv.tx_url} target="_blank" rel="noreferrer"><Mono>{inv.tx_hash}</Mono></Link> : <Mono>{inv.tx_hash}</Mono>}</Row>}
          <Row label="Confirmations">{inv.confirmations} / {inv.required_confirmations}</Row>
          {inv.note && <Row label="Note">{inv.note}</Row>}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Transfers</Typography>
          {data!.transfers.length === 0 && <Typography color="text.secondary">No transfer linked.</Typography>}
          {data!.transfers.map((t) => (
            <Paper key={t.id} sx={{ p: 1.5, mb: 1 }}>
              <Stack direction="row" justifyContent="space-between"><b>{t.amount} {t.asset}</b><StatusChip status={t.status} /></Stack>
              <Typography variant="body2" color="text.secondary">from <Mono>{short(t.from_address)}</Mono> · {when(t.block_time)} · {t.confirmations} conf</Typography>
              {t.tx_url ? <Link href={t.tx_url} target="_blank" rel="noreferrer" variant="body2"><Mono>{short(t.tx_hash, 14)}</Mono></Link> : <Mono>{short(t.tx_hash, 14)}</Mono>}
            </Paper>
          ))}
          {can('billing.write') && decidable && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => setDialog('credit')}>Credit and grant Premium</Button>
              <Button color="error" variant="outlined" onClick={() => setDialog('reject')}>Reject</Button>
            </Stack>
          )}
        </>
      )}
      <NoteDialog
        open={dialog === 'credit'}
        title="Credit this invoice"
        text={`Marks it paid and grants ${inv?.plan?.name ?? 'the plan'} to ${inv?.user_email}. Only do this after checking the transfer on the explorer.`}
        confirm="Credit"
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          const ok = await run(() => post(`/invoices/${id}/credit`, { note }), 'Invoice credited')
          if (ok) { reload(); onChanged() }
          return ok
        }}
      />
      <NoteDialog
        open={dialog === 'reject'}
        title="Reject this invoice"
        text="Closes the invoice without granting Premium. If money arrived, refund it from the wallet and say so in the note."
        confirm="Reject"
        danger
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          const ok = await run(() => post(`/invoices/${id}/reject`, { note }), 'Invoice rejected')
          if (ok) { reload(); onChanged() }
          return ok
        }}
      />
    </Drawer>
  )
}
