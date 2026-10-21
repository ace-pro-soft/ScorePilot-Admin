import {
  Alert, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { EmptyRow, ErrorBox, Loading, PageHeader, useAction, useLoad, when } from '../components/common'

type Pick = {
  fixture_id: string; title: string; league: string; kickoff_at: string; phase: string; selection: string
  edge_pct: number; market_odds: number; value_pick: boolean; status: string; strength: string; pick_of_day: boolean
}

export default function Picks() {
  const { can } = useAuth()
  const { run, busy } = useAction()
  const { data, error, loading, reload } = useLoad(() => get<{ date: string; items: Pick[]; upcoming: number }>('/picks'))
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const d = data!
  const pod = d.items.find((p) => p.pick_of_day)

  return (
    <>
      <PageHeader title="Picks" subtitle={`Model picks for ${d.date} (UTC). ${d.upcoming} more are published for the next three days.`} />
      <Alert severity={pod ? 'success' : 'info'} sx={{ mb: 2 }} icon={<StarIcon />}>
        {pod ? <>Pick of the Day: <b>{pod.title}</b> ({pod.league}), {pod.selection} at {pod.market_odds.toFixed(2)}.</> : 'No Pick of the Day pinned yet; the backend chooses one on the first request of the day.'}
      </Alert>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Kickoff</TableCell><TableCell>Match</TableCell><TableCell>Pick</TableCell><TableCell align="right">Odds</TableCell><TableCell align="right">Edge</TableCell><TableCell>Phase</TableCell><TableCell>Result</TableCell><TableCell /></TableRow>
            </TableHead>
            <TableBody>
              {d.items.length === 0 && <EmptyRow cols={8} text="No picks today." />}
              {d.items.map((p) => (
                <TableRow key={p.fixture_id} selected={p.pick_of_day}>
                  <TableCell>{when(p.kickoff_at)}</TableCell>
                  <TableCell>
                    {p.title}
                    <Typography variant="caption" color="text.secondary" display="block">{p.league}</Typography>
                  </TableCell>
                  <TableCell>{p.selection} {p.value_pick && <Chip size="small" label={p.strength} sx={{ ml: 0.5 }} />}</TableCell>
                  <TableCell align="right">{p.market_odds.toFixed(2)}</TableCell>
                  <TableCell align="right">{p.edge_pct.toFixed(1)}</TableCell>
                  <TableCell>{p.phase.replace('_', ' ')}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell align="right">
                    {p.pick_of_day ? <Chip size="small" color="success" icon={<StarIcon />} label="Pick of the Day" /> : can('content.write') && (
                      <Button size="small" disabled={busy}
                        onClick={() => run(() => post('/picks/pick-of-day', { fixture_id: p.fixture_id }), 'Pick of the Day updated').then((ok) => { if (ok) reload() })}>
                        Make Pick of the Day
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  )
}
