import { useState } from 'react'
import {
  Alert, Button, Chip, Grid, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material'
import { get, patch } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, Mono, PageHeader, short, useAction, useLoad } from '../components/common'

type Plan = { id: string; name: string; duration_days: number; price_usd_cents: number; active: boolean; sort: number }
type MethodRow = {
  method: { id: string; chain: string; asset: string; network: string; contract?: string; decimals: number; confirmations: number; enabled: boolean; sort: number }
  chain_name: string; address: string; offered: boolean; dev_placeholder: boolean
}

function PlanRow({ plan, writable, onSaved }: { plan: Plan; writable: boolean; onSaved: () => void }) {
  const { run, busy } = useAction()
  const [price, setPrice] = useState((plan.price_usd_cents / 100).toFixed(2))
  const [name, setName] = useState(plan.name)
  const [days, setDays] = useState(String(plan.duration_days))
  const dirty = price !== (plan.price_usd_cents / 100).toFixed(2) || name !== plan.name || days !== String(plan.duration_days)
  return (
    <TableRow>
      <TableCell><Mono>{plan.id}</Mono></TableCell>
      <TableCell><TextField size="small" value={name} onChange={(e) => setName(e.target.value)} disabled={!writable} /></TableCell>
      <TableCell><TextField size="small" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} disabled={!writable} sx={{ width: 90 }} /></TableCell>
      <TableCell><TextField size="small" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!writable} sx={{ width: 110 }} InputProps={{ startAdornment: '$' }} /></TableCell>
      <TableCell>
        <Switch checked={plan.active} disabled={!writable || busy}
          onChange={(e) => run(() => patch(`/billing/plans/${plan.id}`, { active: e.target.checked }), e.target.checked ? 'Plan on sale' : 'Plan withdrawn').then((ok) => ok && onSaved())} />
      </TableCell>
      <TableCell align="right">
        {writable && (
          <Button size="small" variant="contained" disabled={!dirty || busy}
            onClick={() => run(() => patch(`/billing/plans/${plan.id}`, {
              name, duration_days: Number(days), price_usd_cents: Math.round(Number(price) * 100),
            }), 'Plan saved').then((ok) => ok && onSaved())}>
            Save
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function MethodLine({ row, writable, onSaved }: { row: MethodRow; writable: boolean; onSaved: () => void }) {
  const { run, busy } = useAction()
  const m = row.method
  const [conf, setConf] = useState(String(m.confirmations))
  return (
    <TableRow sx={{ opacity: row.offered ? 1 : 0.6 }}>
      <TableCell><b>{m.asset}</b></TableCell>
      <TableCell>{m.network}</TableCell>
      <TableCell>
        {row.address ? <Mono>{short(row.address, 8)}</Mono> : <Typography variant="caption" color="text.secondary">no address configured</Typography>}
        {row.dev_placeholder && <Chip size="small" label="dev" sx={{ ml: 1 }} />}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" value={conf} onChange={(e) => setConf(e.target.value.replace(/\D/g, ''))} disabled={!writable} sx={{ width: 80 }} />
          {writable && conf !== String(m.confirmations) && (
            <Button size="small" disabled={busy} onClick={() => run(() => patch(`/billing/methods/${m.id}`, { confirmations: Number(conf) }), 'Confirmations saved').then((ok) => ok && onSaved())}>Save</Button>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Switch checked={m.enabled} disabled={!writable || busy}
          onChange={(e) => run(() => patch(`/billing/methods/${m.id}`, { enabled: e.target.checked }), `${m.asset} on ${m.network} ${e.target.checked ? 'enabled' : 'disabled'}`).then((ok) => ok && onSaved())} />
      </TableCell>
      <TableCell>{row.offered ? <Chip size="small" color="success" label="offered" /> : <Chip size="small" label="hidden" />}</TableCell>
    </TableRow>
  )
}

export default function Catalogue() {
  const { can } = useAuth()
  const writable = can('catalog.write')
  const plans = useLoad(() => get<{ plans: Plan[] }>('/billing/plans'))
  const methods = useLoad(() => get<{ methods: MethodRow[] }>('/billing/methods'))
  if ((plans.loading && !plans.data) || (methods.loading && !methods.data)) return <Loading />
  const missing = (methods.data?.methods ?? []).filter((m) => !m.address).length

  return (
    <>
      <PageHeader title="Plans & payment methods" subtitle="Prices are in USD and converted at checkout. Open invoices keep the price they were created with." />
      {plans.error && <ErrorBox error={plans.error} onRetry={plans.reload} />}
      <Typography variant="h6" sx={{ mb: 1 }}>Plans</Typography>
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Id</TableCell><TableCell>Name</TableCell><TableCell>Days</TableCell><TableCell>Price</TableCell><TableCell>On sale</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {plans.data?.plans.map((p) => <PlanRow key={`${p.id}-${p.price_usd_cents}-${p.name}-${p.duration_days}`} plan={p} writable={writable} onSaved={plans.reload} />)}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Grid item xs><Typography variant="h6">Payment methods</Typography></Grid>
      </Grid>
      {missing > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {missing} method(s) have no receiving address. Set PAY_ADDRESS_EVM, PAY_ADDRESS_TRON, PAY_ADDRESS_SOLANA or PAY_ADDRESS_BITCOIN on the server to offer them.
        </Alert>
      )}
      {methods.error && <ErrorBox error={methods.error} onRetry={methods.reload} />}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Token</TableCell><TableCell>Network</TableCell><TableCell>Receiving address</TableCell><TableCell>Confirmations</TableCell><TableCell>Enabled</TableCell><TableCell>Checkout</TableCell></TableRow></TableHead>
            <TableBody>
              {methods.data?.methods.map((m) => <MethodLine key={`${m.method.id}-${m.method.confirmations}-${m.method.enabled}`} row={m} writable={writable} onSaved={methods.reload} />)}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  )
}
