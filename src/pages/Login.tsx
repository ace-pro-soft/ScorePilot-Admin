import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import { brand } from '../theme'

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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: brand.dark, p: 2,
      backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(64,249,187,0.12), transparent 40%), radial-gradient(circle at 80% 80%, rgba(34,197,94,0.12), transparent 40%)' }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <img src={`${import.meta.env.BASE_URL}emblem.png`} alt="" width={56} height={56} />
            <Typography variant="h5">
              Score<Box component="span" sx={{ color: 'primary.main' }}>Pilot</Box> Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">Sign in to manage the service</Typography>
          </Stack>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus disabled={needCode} />
              <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={needCode} />
              {needCode && (
                <TextField label="Authenticator code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code' }} autoFocus helperText="Enter the 6-digit code from your authenticator app." />
              )}
              <Button type="submit" variant="contained" size="large" disabled={busy}>{needCode ? 'Verify' : 'Sign in'}</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
