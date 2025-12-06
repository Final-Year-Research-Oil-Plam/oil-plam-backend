# Oil Palm Backend API Documentation

## Overview
This is a comprehensive backend API for managing oil palm trees, bunches, and disease predictions. Built with Express.js, MySQL, and Node.js.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `http://server:3006/api`

## Features
✅ User authentication (register, login)
✅ CRUD operations for trees (add, search, update, delete)
✅ Bunch management with photo uploads
✅ Disease prediction endpoint with image upload
✅ File upload support using Multer
✅ CORS enabled for all routes
✅ JSON responses for all endpoints
✅ Comprehensive database schema with relationships
✅ Environment-based configuration
✅ Health check endpoint

---

## Authentication Endpoints

### 1. Register User
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "nic": "123456789",
  "username": "john_doe",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": 1,
  "data": {
    "id": 1,
    "nic": "123456789",
    "username": "john_doe"
  }
}
```

**Validation:**
- NIC: 5-20 characters
- Username: 3-50 characters, alphanumeric + underscores only
- Password: 6-100 characters
- Passwords must match

---

### 2. Login User
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "nic": "123456789",
    "username": "john_doe",
    "createdAt": "2025-12-04T10:30:00Z"
  }
}
```

---

## Tree Management Endpoints

### 3. Add New Tree
**POST** `/api/trees`

**Request Body:**
```json
{
  "block": "B1",
  "treeNumber": "T001",
  "variety": "Tenera",
  "plantedDate": "2020-01-15",
  "notes": "Healthy tree"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Tree added successfully",
  "data": {
    "id": 1,
    "block": "B1",
    "treeNumber": "T001",
    "variety": "Tenera",
    "plantedDate": "2020-01-15",
    "notes": "Healthy tree"
  }
}
```

---

### 4. Get Tree by ID
**GET** `/api/trees/:treeId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "block": "B1",
    "treeNumber": "T001",
    "variety": "Tenera",
    "plantedDate": "2020-01-15",
    "notes": "Healthy tree",
    "created_at": "2025-12-04T10:30:00Z"
  }
}
```

---

### 5. Search Trees
**GET** `/api/trees?block=B1&treeNumber=T001&variety=Tenera`

**Query Parameters:**
- `block` (optional): Filter by block
- `treeNumber` (optional): Filter by tree number
- `variety` (optional): Filter by variety

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "block": "B1",
      "treeNumber": "T001",
      "variety": "Tenera",
      "plantedDate": "2020-01-15",
      "notes": "Healthy tree",
      "created_at": "2025-12-04T10:30:00Z"
    }
  ]
}
```

---

### 6. Update Tree
**PUT** `/api/trees/:treeId`

**Request Body:**
```json
{
  "block": "B1",
  "treeNumber": "T001",
  "variety": "Dura",
  "plantedDate": "2020-01-15",
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Tree updated successfully",
  "data": {
    "id": 1,
    "block": "B1",
    "treeNumber": "T001",
    "variety": "Dura",
    "plantedDate": "2020-01-15",
    "notes": "Updated notes"
  }
}
```

---

### 7. Delete Tree
**DELETE** `/api/trees/:treeId`

**Response (200):**
```json
{
  "success": true,
  "message": "Tree deleted successfully"
}
```

---

## Bunch Management Endpoints

### 8. Add New Bunch
**POST** `/api/bunches`

**Request:** multipart/form-data
- `treeId` (required): Tree ID
- `bunchNumber` (required): Bunch identification number
- `stage` (optional): Growth stage (e.g., "immature", "mature")
- `weight` (optional): Weight in kg
- `notes` (optional): Additional notes
- `photo` (optional): Image file (jpeg, png, gif, webp - max 10MB)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/bunches \
  -F "treeId=1" \
  -F "bunchNumber=B001" \
  -F "stage=mature" \
  -F "weight=25.5" \
  -F "photo=@image.jpg"
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bunch added successfully",
  "data": {
    "id": 1,
    "treeId": 1,
    "bunchNumber": "B001",
    "stage": "mature",
    "weight": 25.5,
    "photoPath": "uploads/image-1701676200000-123456789.jpg",
    "notes": null
  }
}
```

---

### 9. Predict Bunch Disease
**POST** `/api/bunches/predict`

**Request:** multipart/form-data
- `block` (required): Block identifier
- `treeId` (required): Tree ID
- `bunchId` (required): Bunch ID
- `photo` (required): Photo for analysis (jpeg, png, gif, webp - max 10MB)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/bunches/predict \
  -F "block=B1" \
  -F "treeId=1" \
  -F "bunchId=1" \
  -F "photo=@disease_image.jpg"
```

**Response (201):**
```json
{
  "success": true,
  "message": "Prediction completed successfully",
  "data": {
    "id": 1,
    "block": "B1",
    "treeId": 1,
    "bunchId": 1,
    "photoPath": "uploads/disease_image-1701676200000-987654321.jpg",
    "prediction": {
      "healthy": 0.85,
      "diseased": 0.15,
      "confidence": 0.92
    },
    "confidence": 0.92
  }
}
```

**Note:** Currently returns mock prediction. Integrate with your ML model by replacing the mock prediction logic in `controllers/bunchController.js`.

---

### 10. Get Bunch Data
**GET** `/api/bunches/:bunchId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bunch": {
      "id": 1,
      "treeId": 1,
      "bunchNumber": "B001",
      "stage": "mature",
      "weight": 25.5,
      "photoPath": "uploads/image-1701676200000-123456789.jpg",
      "notes": null,
      "created_at": "2025-12-04T10:30:00Z"
    },
    "latestPrediction": {
      "id": 1,
      "bunchId": 1,
      "treeId": 1,
      "photoPath": "uploads/disease_image-1701676200000-987654321.jpg",
      "prediction": "{\"healthy\": 0.85, \"diseased\": 0.15}",
      "confidence": 0.92,
      "predictionDate": "2025-12-04T10:35:00Z"
    }
  }
}
```

---

### 11. Get All Bunches for a Tree
**GET** `/api/bunches/tree/:treeId`

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "treeId": 1,
      "bunchNumber": "B001",
      "stage": "mature",
      "weight": 25.5,
      "photoPath": "uploads/image-1701676200000-123456789.jpg",
      "notes": null,
      "created_at": "2025-12-04T10:30:00Z"
    }
  ]
}
```

---

## General Endpoints

### 12. Health Check
**GET** `/api/health`

**Response (200):**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-12-04T10:40:00Z"
}
```

---

## File Upload Details

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Constraints
- Maximum file size: 10 MB
- Files stored in: `/uploads` directory
- File naming: `{originalName}-{timestamp}-{randomId}.{ext}`

### Accessing Uploaded Files
```
http://localhost:3000/uploads/filename.jpg
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error. Please try again later.",
  "error": "Detailed error message (only in development)"
}
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nic VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Trees Table
```sql
CREATE TABLE trees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  block VARCHAR(50) NOT NULL,
  treeNumber VARCHAR(50) NOT NULL,
  variety VARCHAR(100),
  plantedDate DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tree (block, treeNumber),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Bunches Table
```sql
CREATE TABLE bunches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  treeId INT NOT NULL,
  bunchNumber VARCHAR(50) NOT NULL,
  stage VARCHAR(50),
  weight DECIMAL(10, 2),
  photoPath VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (treeId) REFERENCES trees(id)
);
```

### Predictions Table
```sql
CREATE TABLE predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bunchId INT NOT NULL,
  treeId INT NOT NULL,
  photoPath VARCHAR(255),
  prediction JSON,
  confidence DECIMAL(5, 2),
  predictionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bunchId) REFERENCES bunches(id),
  FOREIGN KEY (treeId) REFERENCES trees(id)
);
```

---

## Environment Configuration

### Development (.env.development)
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=oilplam
```

### Production (.env.production)
```
NODE_ENV=production
PORT=3006
DB_HOST=136.112.65.191
DB_PORT=3306
DB_USER=saas
DB_PASSWORD=your_secure_password
DB_NAME=oilplam
```

---

## Running the Application

### Development
```bash
npm run dev
```
Starts with nodemon auto-reload on file changes.

### Production
```bash
npm start
```

---

## Project Structure
```
oil-plam-backend/
├── config/
│   └── db.js                 # Database configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── loginController.js    # Login logic
│   ├── registerController.js # Registration logic
│   ├── treeController.js     # Tree CRUD operations
│   └── bunchController.js    # Bunch & prediction logic
├── middleware/
│   └── upload.js             # Multer file upload config
├── routes/
│   ├── auth.js              # Auth routes
│   ├── tree.js              # Tree routes
│   └── bunch.js             # Bunch routes
├── uploads/                  # Uploaded images directory
├── server.js                # Express app setup
├── package.json
└── .env.development         # Dev environment
```

---

## CORS Configuration
CORS is enabled for all origins. To restrict in production, update `server.js`:
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

---

## Notes
- Database credentials are never exposed to the frontend (stored in .env files)
- All endpoints return JSON responses
- File uploads are stored server-side and accessible via `/uploads` route
- Use HTTPS in production for secure password transmission
- Implement JWT authentication for enhanced security
- Integration with ML model required for actual disease prediction

