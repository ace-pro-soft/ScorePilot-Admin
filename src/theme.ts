import { createTheme } from '@mui/material/styles'

// Brand board: Emerald primary, Accent green, Charcoal text, white surfaces on light gray.
export const brand = {
  emerald: '#0B6B3A',
  accent: '#22C55E',
  charcoal: '#0F172A',
  dark: '#001713',
  mint: '#40F9BB',
  gold: '#B45309',
  goldBg: '#FEF3C7',
  red: '#DC2626',
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.emerald, contrastText: '#fff' },
    secondary: { main: brand.accent },
    error: { main: brand.red },
    warning: { main: brand.gold },
    success: { main: '#16A34A' },
    background: { default: '#F3F4F6', paper: '#FFFFFF' },
    text: { primary: brand.charcoal, secondary: '#475569' },
    divider: '#E5E7EB',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #E5E7EB' } } },
    MuiAppBar: { styleOverrides: { root: { border: 0 } } },
    MuiDrawer: { styleOverrides: { paper: { border: 0 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
})
