const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  // ✅ Added validation for empty fields
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    // ✅ Fetch user from DB
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = users[0];

    // ✅ Verify password (previous error: maybe comparing plain password with hashed)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // ✅ Return user data without password
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        nic: user.nic,
        username: user.username,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};
