# PalmHarvest Pro - Backend API Server

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL Docker container details:
```
DB_HOST=localhost          # or your Docker container IP
DB_PORT=3306              # MySQL port (usually 3306)
DB_USER=root              # Your MySQL username
DB_PASSWORD=your_password # Your MySQL password
DB_NAME=oilplam_db        # Database name
PORT=3000                 # API server port
```

### 3. Create Database
Connect to your MySQL container and create the database:
```sql
CREATE DATABASE oilplam_db;
```

Or use MySQL Workbench to create the database.

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Test the Connection
Visit: http://localhost:3000/api/health

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- Body: `{ nic, username, password, confirmPassword }`
- Response: `{ success: true, message: "User registered successfully", userId: 1 }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ username, password }`
- Response: `{ success: true, message: "Login successful", user: {...} }`

## Docker MySQL Connection

If your MySQL is running in Docker, make sure:
1. The container is running: `docker ps`
2. Port 3306 is exposed: `docker run -p 3306:3306 ...`
3. Use `localhost` or `127.0.0.1` as DB_HOST if port is mapped
4. Or use the container's IP address if connecting from host

