import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      search: req.query.search || '',
      role: req.query.role || '',
      limit: req.query.limit ? Number(req.query.limit) : 100,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createManagedUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Create managed user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.id === id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }

    const updatedUser = await User.update(id, { role });

    res.json({
      message: 'User role updated successfully',
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const updateUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();

    // Prevent removing own admin privileges
    if (role) {
      if (req.user.id === id && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot remove your own admin access' });
      }
      updates.role = role;
    }

    if (password && password.length >= 6) {
      updates.password_hash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await User.update(id, updates);
    res.json({
      message: 'User updated successfully',
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Update user details error:', error);
    res.status(500).json({ error: 'Failed to update user details' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account from the admin panel' });
    }

    await User.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
