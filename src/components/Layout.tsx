import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  AppBar, Avatar, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, Menu, MenuItem, Toolbar, useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutline'
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined'
import SwapIcon from '@mui/icons-material/SwapHorizOutlined'
import SellIcon from '@mui/icons-material/SellOutlined'
import TrophyIcon from '@mui/icons-material/EmojiEventsOutlined'
import StarIcon from '@mui/icons-material/StarOutline'
import TuneIcon from '@mui/icons-material/TuneOutlined'
import SystemUpdateIcon from '@mui/icons-material/SystemUpdateOutlined'
import SyncIcon from '@mui/icons-material/SyncOutlined'
import AdminIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import HistoryIcon from '@mui/icons-material/HistoryOutlined'
import ForumIcon from '@mui/icons-material/ForumOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../auth'
import { brand } from '../theme'

const WIDTH = 248

type NavItem = { to: string; label: string; icon: ReactNode; perm?: string }
const sections: { title: string; items: NavItem[] }[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: <DashboardIcon /> }] },
  {
    title: 'Customers',
    items: [
      { to: '/users', label: 'Users', icon: <PeopleIcon /> },
      { to: '/payments', label: 'Payments', icon: <ReceiptIcon /> },
      { to: '/transfers', label: 'Transfers', icon: <SwapIcon /> },
      { to: '/community', label: 'Community', icon: <ForumIcon /> },
    ],
  },
  {
    title: 'Product',
    items: [
      { to: '/catalogue', label: 'Plans & methods', icon: <SellIcon /> },
      { to: '/picks', label: 'Picks', icon: <StarIcon /> },
      { to: '/leagues', label: 'Leagues', icon: <TrophyIcon /> },
      { to: '/settings', label: 'App settings', icon: <TuneIcon /> },
      { to: '/releases', label: 'App releases', icon: <SystemUpdateIcon /> },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/operations', label: 'Sync & cache', icon: <SyncIcon /> },
      { to: '/admins', label: 'Admins', icon: <AdminIcon /> },
      { to: '/audit', label: 'Audit log', icon: <HistoryIcon /> },
    ],
  },
]

function Brand() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <img src={`${import.meta.env.BASE_URL}xwillwin-logo-light.svg`} alt="XWillWin" width={139} height={28} style={{ display: 'block' }} />
      <Chip label="Admin" size="small" color="primary" sx={{ height: 22, fontSize: 12 }} />
    </Box>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<null | HTMLElement>(null)
  const { admin, logout } = useAuth()
  const loc = useLocation()

  const nav = (
    <Box sx={{ bgcolor: brand.panel, color: brand.chalk, height: '100%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${brand.line}` }}>
      <Toolbar><Brand /></Toolbar>
      <Divider />
      <Box sx={{ overflowY: 'auto', flex: 1, pb: 2 }}>
        {sections.map((s) => (
          <List key={s.title} dense subheader={<ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '32px', mt: 1 }}>{s.title}</ListSubheader>}>
            {s.items.map((it) => {
              const active = it.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(it.to)
              return (
                <ListItemButton
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  sx={{
                    position: 'relative', mx: 1, borderRadius: 1, color: active ? brand.chalk : brand.chalk2,
                    bgcolor: active ? alpha(brand.model, 0.12) : 'transparent',
                    '&:hover': { bgcolor: active ? alpha(brand.model, 0.16) : 'rgba(243,245,251,0.05)', color: brand.chalk },
                    // the site's glowing cyan bar marks where you are
                    '&::before': active ? {
                      content: '""', position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
                      bgcolor: brand.model, boxShadow: `0 0 10px ${alpha(brand.model, 0.8)}`,
                    } : undefined,
                    '& .MuiListItemIcon-root': { color: active ? brand.model : 'inherit' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{it.icon}</ListItemIcon>
                  <ListItemText primary={it.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
                </ListItemButton>
              )
            })}
          </List>
        ))}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" sx={{
        bgcolor: alpha(brand.ink, 0.88), backdropFilter: 'blur(12px) saturate(140%)', boxShadow: `0 1px 0 ${brand.line}`,
        width: { md: `calc(100% - ${WIDTH}px)` }, ml: { md: `${WIDTH}px` },
      }}>
        <Toolbar>
          {!wide && <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }}><MenuIcon /></IconButton>}
          <Box sx={{ flex: 1 }} />
          <Chip label={admin?.role} size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
          <IconButton onClick={(e) => setMenu(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: brand.violet, color: brand.ink, fontWeight: 800 }}>{(admin?.name || admin?.email || '?')[0].toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
            <MenuItem disabled>{admin?.email}</MenuItem>
            <MenuItem component={NavLink} to="/account" onClick={() => setMenu(null)}>Account & two-factor</MenuItem>
            <MenuItem onClick={() => { setMenu(null); logout() }}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: WIDTH }, flexShrink: { md: 0 } }}>
        {wide ? (
          <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper': { width: WIDTH } }}>{nav}</Drawer>
        ) : (
          <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ '& .MuiDrawer-paper': { width: WIDTH } }}>{nav}</Drawer>
        )}
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 4 }, pt: { xs: 10, md: 12 } }}>{children}</Box>
    </Box>
  )
}
