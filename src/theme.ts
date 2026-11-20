import { alpha, createTheme } from '@mui/material/styles'

// The xwillwin.com palette ("matchday broadcast"): a navy night with one colour per meaning.
// Gold is for actions, cyan for navigation, information and the model's numbers; green only
// means a good state (paid, healthy, online), red a bad one, orange a warning or a wait.
export const brand = {
  ink: '#070b1a',      // page background
  panel: '#0e1530',    // cards, tables
  panel2: '#16204a',   // menus, dialogs, hover
  chalk: '#f3f5fb',    // text
  chalk2: '#b7c0d8',   // secondary text
  sideline: '#7d88a8', // labels
  line: 'rgba(243,245,251,0.10)',
  model: '#35d0ff',
  gold: '#ffc93c',
  win: '#33e08f',
  loss: '#ff5468',
  time: '#ff8f3a',
  violet: '#a593ff',
}

// Archivo has a width axis: condensed for titles and numbers, like the site.
export const condensed = { fontVariationSettings: '"wdth" 62', fontWeight: 800 }
const cut = (px: number) => `polygon(0 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%)`

type Tone = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: brand.gold, light: '#ffd666', dark: '#e9b021', contrastText: brand.ink },
    secondary: { main: brand.model, contrastText: brand.ink },
    info: { main: brand.model, contrastText: brand.ink },
    success: { main: brand.win, contrastText: brand.ink },
    warning: { main: brand.time, contrastText: brand.ink },
    error: { main: brand.loss, contrastText: brand.ink },
    background: { default: brand.ink, paper: brand.panel },
    text: { primary: brand.chalk, secondary: brand.chalk2, disabled: 'rgba(243,245,251,0.38)' },
    divider: brand.line,
    action: { hover: 'rgba(243,245,251,0.06)', selected: alpha(brand.model, 0.12) },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: 'Archivo, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { ...condensed, lineHeight: 1.05 },
    h5: { fontWeight: 800, fontVariationSettings: '"wdth" 80' },
    h6: { fontWeight: 700, fontVariationSettings: '"wdth" 85', fontSize: '1.15rem' },
    button: { textTransform: 'none', fontWeight: 700, fontVariationSettings: '"wdth" 88', letterSpacing: '0.01em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // the site's floodlights, faint and fixed behind everything
          backgroundImage: [
            `radial-gradient(40% 50% at 92% -8%, ${alpha(brand.model, 0.10)}, transparent 70%)`,
            `radial-gradient(34% 44% at 18% -10%, ${alpha(brand.violet, 0.10)}, transparent 70%)`,
            `radial-gradient(30% 40% at 60% 110%, ${alpha(brand.gold, 0.05)}, transparent 70%)`,
          ].join(', '),
          backgroundAttachment: 'fixed',
          colorScheme: 'dark',
        },
        '::selection': { background: alpha(brand.model, 0.35) },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${brand.line}` } },
    },
    MuiCard: { styleOverrides: { root: { backgroundColor: brand.panel } } },
    MuiAppBar: { styleOverrides: { root: { border: 0 } } },
    MuiDrawer: { styleOverrides: { paper: { border: 0 } } },
    MuiMenu: { styleOverrides: { paper: { backgroundColor: brand.panel2 } } },
    MuiPopover: { styleOverrides: { paper: { backgroundColor: brand.panel2 } } },
    MuiDialog: { styleOverrides: { paper: { backgroundColor: brand.panel, boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px ${brand.line}` } } },
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: brand.panel2, color: brand.chalk, border: `1px solid ${brand.line}`, fontSize: 13 } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 0 },
        // the site's buttons: solid, with the bottom-right corner cut off
        contained: { clipPath: cut(8) },
        outlined: ({ ownerState }) => (ownerState.color === 'primary' || !ownerState.color
          ? { color: brand.chalk, borderColor: 'rgba(243,245,251,0.35)', '&:hover': { borderColor: brand.model, backgroundColor: alpha(brand.model, 0.06) } }
          : {}),
      },
    },
    MuiChip: {
      styleOverrides: {
        // like the site's "Won"/"Lost" tags: tinted, not solid
        root: ({ ownerState, theme: t }) => {
          const c = ownerState.color as Tone | 'default' | undefined
          if (!c || c === 'default') return { fontWeight: 600, borderRadius: 4 }
          const main = t.palette[c].main
          return ownerState.variant === 'outlined'
            ? { fontWeight: 600, borderRadius: 4 }
            : { fontWeight: 600, borderRadius: 4, backgroundColor: alpha(main, 0.14), color: main, boxShadow: `inset 0 0 0 1px ${alpha(main, 0.35)}` }
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: brand.line },
        head: { fontWeight: 700, color: brand.sideline, whiteSpace: 'nowrap', fontSize: 13, letterSpacing: '0.02em', fontVariationSettings: '"wdth" 90' },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: alpha(brand.model, 0.05) } } } },
    MuiListSubheader: { styleOverrides: { root: { color: brand.sideline, fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' } } },
    MuiLink: { defaultProps: { color: 'secondary' } },
    MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: 'rgba(243,245,251,0.18)' } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 4 } } },
  },
})
