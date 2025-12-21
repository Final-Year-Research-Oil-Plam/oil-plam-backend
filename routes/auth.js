const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');
const loginController = require('../controllers/loginController');

// ✅ POST /api/auth/register
// This route calls the register function to add new users
router.post('/register', registerController.register);

// ✅ POST /api/auth/login
// This route calls the login function to authenticate users
router.post('/login', loginController.login);

// ✅ GET /api/auth/users
// Get all registered users
router.get('/users', registerController.getAllUsers);

// ✅ DELETE /api/auth/users/:id
// Delete a user by ID
router.delete('/users/:id', registerController.deleteUser);

module.exports = router;
