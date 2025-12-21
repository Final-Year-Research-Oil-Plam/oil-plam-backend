const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

exports.register = async (req, res) => {
  const { nic, username, password, confirmPassword } = req.body;

  // ❌ Previous error: maybe you didn't validate or hash the password before insert
  if (!nic || !username || !password || !confirmPassword) {
    return res.json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.json({ success: false, message: 'Passwords do not match' });
  }

  try {
    // 🔑 Hash the password before inserting
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert into DB
    const [result] = await pool.query(
      'INSERT INTO users (nic, username, password) VALUES (?, ?, ?)',
      [nic, username, hashedPassword]
    );

    res.json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Registration error:', error);

    // ❌ Handle unique constraint errors (duplicate NIC or username)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'NIC or Username already exists' });
    }

    res.json({ success: false, message: 'Registration failed', error: error.message });
  }
};

/**
 * GET /api/auth/users
 * Get all registered users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nic, username, created_at FROM users ORDER BY created_at DESC'
    );

    console.log(`✅ GET /auth/users - ${users.length} users found`);

    res.json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/auth/users/:id
 * Delete a user by ID
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(`✅ DELETE /auth/users/${id} - User deleted`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

