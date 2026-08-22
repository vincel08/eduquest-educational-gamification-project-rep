import { useState } from "react";
import {
  AppBar,
  Avatar,
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeModeContext";
import NotificationBell from "../components/common/NotificationBell";
import PageTransition from "../components/common/PageTransition";
import BrandLogo from "../components/common/BrandLogo";
import { buildAuthenticatedFileUrl } from "../utils/fileUrls";

const drawerWidth = 260;

export default function DashboardLayout({ title, navItems, sidebarFilters = null }) {
  const { user, logout, profile } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prefer auth user.avatarUrl (authenticated /api/files/avatars/:id).
  // profile.avatar_url can be a raw uploads path that the browser cannot load.
  const avatarSrc = buildAuthenticatedFileUrl(
    user?.avatarUrl || profile?.avatar_url,
  );

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2.5, pb: 2 }}>
        <BrandLogo size="sidebar" />
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ display: "block", mt: 1, px: 0.25 }}
        >
          {title}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 1.5, flex: 1, overflowY: "auto" }}>
        {navItems.map((item) => {
          const selected =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              aria-label={item.label}
            >
              <ListItemIcon sx={{ color: "primary.main", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: 700,
                  fontSize: "0.92rem",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      {sidebarFilters}
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            p: 1.25,
            mb: 1,
            borderRadius: 3,
            bgcolor: "action.hover",
          }}
        >
          <Avatar
            src={avatarSrc || undefined}
            alt={user?.firstName || "User"}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "secondary.main",
              fontWeight: 800,
            }}
          >
            {(user?.firstName || "U").charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={700} fontSize="0.9rem">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography
              noWrap
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "capitalize", fontWeight: 700 }}
            >
              {user?.role === "student" ? "Student" : user?.role}
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={() => {
            logout();
            navigate("/login");
          }}
          aria-label="Logout"
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontWeight: 700 }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box className="app-shell" sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 64, md: 68 } }}>
          {isMobile ? (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          {isMobile ? (
            <BrandLogo size="compact" sx={{ mr: 1 }} />
          ) : null}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>
              Hey, {user?.firstName}!
            </Typography>
            <Typography
              variant="caption"
              color="secondary.main"
              sx={{ textTransform: "capitalize", fontWeight: 700 }}
            >
              {user?.role === "student" ? "Learner Quest" : title}
            </Typography>
          </Box>
          <IconButton onClick={toggleMode} aria-label="Toggle theme">
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <NotificationBell />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="Main navigation"
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
              backgroundImage: "none",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8, md: 8.5 },
          minWidth: 0,
        }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>
    </Box>
  );
}
