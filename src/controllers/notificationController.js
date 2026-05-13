import { Notification } from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findByUserId(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findUnreadByUserId(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.markAsRead(id, req.user.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({ message: 'Notification marked as read', unreadCount });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.delete(id, req.user.id);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
