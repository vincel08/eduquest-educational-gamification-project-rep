import { useState } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import NotificationBell from '../components/common/NotificationBell';

const drawerWidth = 268;

export default function DashboardLayout({ title, navItems }) {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EduQuest
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={800}>
          {title}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.25, flex: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname.startsWith(item.path)}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{ borderRadius: 3, mb: 0.75 }}
          >
            <ListItemIcon sx={{ color: 'primary.main', minWidth: 42 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List sx={{ px: 1.25 }}>
        <ListItemButton
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{ borderRadius: 3 }}
        >
          <ListItemIcon sx={{ minWidth: 42 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 700 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box className="app-shell" sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid rgba(59,130,246,0.12)',
        }}
      >
        <Toolbar>
          {isMobile ? (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label="Open navigation">
              <MenuIcon />
            </IconButton>
          ) : null}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={900}>
              Hey, {user?.firstName}!
            </Typography>
            <Typography
              variant="caption"
              color="secondary.main"
              sx={{ textTransform: 'capitalize', fontWeight: 800 }}
            >
              {user?.role === 'student' ? 'Learner' : user?.role}
            </Typography>
          </Box>
          <IconButton onClick={toggleMode} sx={{ mr: 1 }}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <NotificationBell />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(124,58,237,0.14)',
              backgroundImage: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component={motion.main}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
