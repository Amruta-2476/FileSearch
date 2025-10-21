# FileSearch

FileSearch is a web app that helps architectural firms organize, search, and manage project files effortlessly.
It combines a modern **React frontend** with a **Node.js + MySQL backend**, offering fast search, smart filtering, CSV import/export, and admin-level control — all in one place.

## 🚀 Features

* **🔍 Smart Search:** Find files/subfiles by number, name, or keywords.
* **🎙️ Voice Search:** Hands-free searching.
* **⚙️ Advanced Filters:** Filter by status — Current, Record, Completed, Cancelled, etc.
* **🔒 Secure Authentication:** Only admins can modify data (**JWT-based login with password hashing (bcrypt)**).
* **🧑‍💼 Admin Panel:**<br>
       * Add / Edit / Delete file records<br>
       * 📥 CSV Import: Bulk upload files — auto-groups subfiles, skips duplicates, and updates valid records only.<br>
       * 📤 CSV Export: Download all data as a clean, structured CSV preserving parent–subfile hierarchy.
* **📱 Responsive UI:** Works smoothly on any device.

## 🖥️ Usage

### 🔹 Public Access
* Search by file no/name
* Use voice search
* Apply filters or sorting

### 🔹 Admin Access
* Login → Admin Login
* Add, edit, or delete files
* Import CSV (bulk add)
* Export CSV (download full data)

  
## 🧩 Tech Stack

* **Frontend (Client) :** React.js, Axios, Lucide-React, Papa Parse, CSS

* **Backend (Server) :** Node.js, Express.js, MySQL, mysql2, JWT, bcrypt, Multer, CORS

## ⚙️ Setup Guide

### 1. Database Setup

1.  **Create Database:**
    Open your MySQL client (e.g., MySQL Workbench) and create a new database.
    ```sql
    CREATE DATABASE file_search_db;
    USE file_search_db;
    ```

2.  **Create `files` Table:**
    Create the `files` table to store your project data.
    ```sql
    CREATE TABLE files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_no VARCHAR(255) NOT NULL UNIQUE,
        file_name VARCHAR(255),
        current VARCHAR(255),
        record VARCHAR(255),
        completed VARCHAR(255),
        remark TEXT,
        sub_files JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
    ```

3.  **Create `users` Table (for Admin):**
    Create the `users` table for administrator authentication.
    ```sql
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    );
    ```

4.  **Insert Admin User:**
    Insert an admin user. **Remember to change `admin_password` to a secure password.** 
    ```sql
    INSERT INTO users (username, password) VALUES ('admin', 'admin_password');
    ```

### 2. Backend Setup 

1.
    ```bash
    cd server
    npm install
    ```

2.  Create `.env` in the `server` directory:
    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_DATABASE=file_search_db
    JWT_SECRET=super_secret_key
    PORT=8080
    ```

3.  Start server:
    ```bash
    npm start
    ```

### 3. Frontend Setup

1.  Open a new terminal:
    ```bash
    cd client
    npm install
    npm run dev
    ```
    App runs at: `http://localhost:5173`.
