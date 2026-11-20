import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import { alpha } from '@mui/material/styles'
import { brand, condensed } from '../theme'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password, needCode ? code.trim() : undefined)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'code_required') {
        setNeedCode(true)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: brand.ink, p: 2,
      // the site's hero floodlights: cyan, violet and a little gold
      backgroundImage: [
        `radial-gradient(40% 55% at 86% -4%, ${alpha(brand.model, 0.22)}, transparent 70%)`,
        `radial-gradient(34% 42% at 2% -6%, ${alpha(brand.violet, 0.2)}, transparent 70%)`,
        `radial-gradient(30% 40% at 60% 108%, ${alpha(brand.gold, 0.09)}, transparent 70%)`,
      ].join(', ') }}>
      <Card sx={{ width: '100%', maxWidth: 400, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 60px ${alpha(brand.model, 0.12)}` }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <img src={`${import.meta.env.BASE_URL}xwillwin-logo-light.svg`} alt="XWillWin" width={238} height={48} style={{ display: 'block' }} />
            <Typography variant="h5" sx={{ ...condensed, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Admin</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to manage the service</Typography>
          </Stack>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus disabled={needCode} />
              <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={needCode} />
              {needCode && (
                <TextField label="Authenticator code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code' }} autoFocus />
              )}
              <Button type="submit" variant="contained" size="large" disabled={busy}>{needCode ? 'Verify' : 'Sign in'}</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
