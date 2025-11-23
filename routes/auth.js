const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    // Extract and trim input fields
    const { nic, username, password, confirmPassword } = req.body;
    const trimmedNic = nic ? nic.trim() : '';
    const trimmedUsername = username ? username.trim() : '';
    const trimmedPassword = password ? password.trim() : '';
    const trimmedConfirmPassword = confirmPassword ? confirmPassword.trim() : '';

    // Validation - Check if all fields are provided
    if (!trimmedNic || !trimmedUsername || !trimmedPassword || !trimmedConfirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // NIC validation
    if (trimmedNic.length < 5 || trimmedNic.length > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'NIC must be between 5 and 20 characters' 
      });
    }

    // Username validation
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be between 3 and 50 characters' 
      });
    }

    // Username format validation (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username can only contain letters, numbers, and underscores' 
      });
    }

    // Password validation
    if (trimmedPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    if (trimmedPassword.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be less than 100 characters' 
      });
    }

    // Password confirmation validation
    if (trimmedPassword !== trimmedConfirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    // Check if NIC or username already exists
    const [existingUsers] = await pool.query(
      'SELECT nic, username FROM users WHERE nic = ? OR username = ?',
      [trimmedNic, trimmedUsername]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.nic === trimmedNic) {
        return res.status(400).json({ 
          success: false, 
          message: 'NIC already registered' 
        });
      }
      if (existing.username === trimmedUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already taken' 
        });
      }
    }

    // Hash password with bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (nic, username, password) VALUES (?, ?, ?)',
      [trimmedNic, trimmedUsername, hashedPassword]
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId,
      data: {
        id: result.insertId,
        nic: trimmedNic,
        username: trimmedUsername
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'NIC or username already exists' 
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Return user data (excluding password)
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
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

module.exports = router;

