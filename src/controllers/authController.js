import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, addToBlacklist } from '../config/jwt.js';
import { Notification } from '../models/Notification.js';

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    whatsapp: user.whatsapp,
    role: user.role,
    created_at: user.created_at
  };
}

export const register = async (req, res) => {
  try {
    const { name, email, whatsapp, password, role } = req.body;

    // Check if email already exists (for admin accounts)
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // Check if whatsapp already exists
    if (whatsapp) {
      const existingWhatsapp = await User.findByWhatsapp(whatsapp);
      if (existingWhatsapp) {
        return res.status(409).json({ error: 'WhatsApp number already registered' });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email: email ? email.trim().toLowerCase() : null,
      whatsapp: whatsapp ? whatsapp.trim() : null,
      password_hash,
      role: role || 'user'
    });

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.status(201).json({
      message: 'Registration successful',
      user: serializeUser(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { whatsapp, password } = req.body;

    // Find user by whatsapp
    const user = await User.findByWhatsapp(whatsapp);
    if (!user) {
      return res.status(404).json({ error: 'whatsapp_not_found', message: 'رقم الواتساب غير مسجل لدينا.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'incorrect_password', message: 'كلمة المرور غير صحيحة.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.json({
      message: 'Login successful',
      user: serializeUser(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'server_error', message: 'حدث خطأ في خادم تسجيل الدخول.' });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'email_not_found', message: 'البريد الإلكتروني غير مسجل لدينا.' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'unauthorized_admin', message: 'ليس لديك صلاحية مسؤول.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'incorrect_password', message: 'كلمة المرور غير صحيحة.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.json({
      message: 'Admin login successful',
      user: serializeUser(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'server_error', message: 'حدث خطأ في خادم تسجيل الدخول للإدارة.' });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      addToBlacklist(token);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, whatsapp } = req.body;

    if (email && email !== currentUser.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    if (whatsapp && whatsapp !== currentUser.whatsapp) {
      const existingWhatsapp = await User.findByWhatsapp(whatsapp);
      if (existingWhatsapp && existingWhatsapp.id !== req.user.id) {
        return res.status(409).json({ error: 'WhatsApp number already registered' });
      }
    }

    const updatedUser = await User.update(req.user.id, {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      whatsapp: whatsapp ? whatsapp.trim() : null
    });

    res.json({
      message: 'Profile updated successfully',
      user: serializeUser(updatedUser)
    });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findWithPasswordById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await User.update(req.user.id, { password_hash });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
