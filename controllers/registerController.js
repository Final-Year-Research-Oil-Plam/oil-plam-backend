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
