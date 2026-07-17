import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useLocation, useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';

dayjs.extend(relativeTime);

export default function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await notificationService.list();
      const data = response.data.data || {};
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  async function handleOpen(event) {
    setAnchorEl(event.currentTarget);
    await loadNotifications();
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // keep current state if request fails
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification.is_read) {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // still allow navigation if mark-as-read fails
    }

    handleClose();
    if (notification.link) {
      navigate(notification.link);
    }
  }

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="Open notifications">
        <Badge badgeContent={unreadCount} color="secondary">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          <Button size="small" onClick={handleMarkAllRead} disabled={!unreadCount}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        <List sx={{ maxHeight: 420, overflowY: 'auto', py: 0 }}>
          {loading && !notifications.length ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Loading notifications...
              </Typography>
            </Box>
          ) : null}

          {!loading && !notifications.length ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet.
              </Typography>
            </Box>
          ) : null}

          {notifications.map((notification) => (
            <ListItemButton
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              alignItems="flex-start"
              sx={{
                bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ListItemText
                primary={(
                  <Typography variant="body2" fontWeight={notification.is_read ? 500 : 700}>
                    {notification.title}
                  </Typography>
                )}
                secondary={(
                  <>
                    <Typography variant="body2" color="text.secondary" component="span" display="block">
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {dayjs(notification.created_at).fromNow()}
                    </Typography>
                  </>
                )}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
}
