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
  useTheme,
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

export default function DashboardLayout({
  title,
  navItems,
  sidebarFilters = null,
  profilePath = null,
  showNotifications = true,
}) {
  const theme = useTheme();
  const { user, logout, profile } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  // Keep in sync with MUI `md` (900px): permanent drawer only from md and up.
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatarSrc = buildAuthenticatedFileUrl(
    user?.avatarUrl || profile?.avatar_url,
  );

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2 }}>
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
      <List sx={{ px: 1.5, py: 1.5, flex: 1, overflowY: "auto", minHeight: 0 }}>
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
      {sidebarFilters ? (
        <Box sx={{ flexShrink: 0, overflowY: "auto", maxHeight: { xs: "40vh", md: "none" } }}>
          {sidebarFilters}
        </Box>
      ) : null}
      <Divider />
      <Box sx={{ p: 1.5, flexShrink: 0 }}>
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
              flexShrink: 0,
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
    <Box className="app-shell" sx={{ display: "flex", width: "100%", overflowX: "hidden" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
          ml: isMobile ? 0 : `${drawerWidth}px`,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 0.5, sm: 1 },
            minHeight: { xs: 56, sm: 64, md: 68 },
            px: { xs: 1, sm: 2 },
          }}
        >
          {isMobile ? (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          {isMobile ? <BrandLogo size="compact" sx={{ mr: 0.5 }} /> : null}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={800}
              noWrap
              sx={{ fontSize: { xs: "1rem", sm: "1.15rem" } }}
            >
              Hey, {user?.firstName}!
            </Typography>
            <Typography
              variant="caption"
              color="secondary.main"
              noWrap
              sx={{
                textTransform: "capitalize",
                fontWeight: 700,
                display: { xs: "none", sm: "block" },
              }}
            >
              {user?.role === "student" ? "Learner Quest" : title}
            </Typography>
          </Box>
          <IconButton onClick={toggleMode} aria-label="Toggle theme" size="small">
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          {showNotifications ? <NotificationBell /> : null}          {profilePath ? (
            <IconButton
              onClick={() => navigate(profilePath)}
              aria-label="Open profile"
              size="small"
              sx={{
                p: 0.35,
                border: location.pathname.startsWith(profilePath)
                  ? "2px solid"
                  : "2px solid transparent",
                borderColor: location.pathname.startsWith(profilePath)
                  ? "primary.main"
                  : "transparent",
              }}
            >
              <Avatar
                src={avatarSrc || undefined}
                alt={user?.firstName || "Profile"}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "secondary.main",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                }}
              >
                {(user?.firstName || "U").charAt(0)}
              </Avatar>
            </IconButton>
          ) : null}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: isMobile ? 0 : drawerWidth,
          flexShrink: 0,
        }}
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
              maxWidth: "100vw",
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
          p: { xs: 1.25, sm: 2, md: 3 },
          // Leave room for the student quest mascot FAB on small screens.
          pb: user?.role === "student"
            ? { xs: 12, sm: 10, md: 4 }
            : { xs: 1.25, sm: 2, md: 3 },
          width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
          mt: { xs: 7, sm: 8, md: 8.5 },
          minWidth: 0,
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>
    </Box>
  );
}
