# AURIX - College Event Management & Collaboration Portal

AURIX is a modern, responsive, and full-featured College Event Management and Club Collaboration portal. It enables student engagement through active clubs, tracks past/present/future events, facilitates club registration request management, and publishes announcements dynamically.

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- **Dashboard**: View ongoing (live) and upcoming events across the college.
- **Club Explorer**: Explore college clubs (Coding Club, Cultural Club, Entrepreneurship Club, Technical Club, and Placement Club).
- **Club Membership**: Request to join clubs with an interactive form (name, course, email, reason).
- **Event Registrations**: Register for events. Dynamic detection updates the action if a student is already a member of a club.
- **Announcements Board**: Live workspace feed for real-time club communications.

### 🛡️ Club Admin Portal
- **Club Dashboard**: Manage membership requests (approve/reject).
- **Event Management**: Create, view, edit, and publish events for their specific club.
- **Announcements**: Publish and delete announcements.
- **Profile Customization**: Edit and update the club's name, description, and cover image.

### ⚙️ System Admin Portal
- **Global Dashboard**: Unified platform governance.
- **User Management**: View, register, and update system users (Students, Club Admins, and Admins).
- **Club Management**: Add/edit clubs and assign administrative roles.
- **Announcements Control**: Publish announcements across the site.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Semantic CSS, JavaScript (Vanilla ES6+)
- **Backend**: Node.js, Express.js, JWT (JSON Web Tokens) Authentication, bcrypt password hashing
- **Database**: MySQL (using `mysql2/promise`)

---

## ⚙️ Project Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)

### 2. Configure Local Database Credentials
Ensure MySQL is running on your machine. The database configuration in `server.js` and `setup_db.js` uses:
- **Host**: `localhost`
- **User**: `root`
- **Password**: `root`
*(If your MySQL credentials differ, adjust the configurations in `server.js` and `setup_db.js` accordingly).*

### 3. Install Dependencies
Navigate to the project root and install the dependencies:
```bash
npm install
```

### 4. Database Setup & Seeding
Initialize the database, tables, and mock data (pre-configured administrative users, clubs, events, and sample students):
```bash
node setup_db.js
```

### 5. Start the Server
Run the Express application:
```bash
node server.js
```
The server will start on: **`http://localhost:5000`**

Open `http://localhost:5000` in your web browser to access the portal.

---

## 🔑 Demo Access Credentials

The database setup seeds the following default accounts for testing:

| Role | Username / Email | Password |
|---|---|---|
| **System Admin** | `sysadmin@aurix.com` | `sysadmin123` |
| **Coding Club Admin** | `coding@aurix.com` | `coding123` |
| **Cultural Club Admin** | `cultural@aurix.com` | `cultural123` |
| **Entrepreneurship Club Admin** | `entrepreneur@aurix.com` | `entrepreneur123` |
| **Technical Club Admin** | `tech@aurix.com` | `tech123` |
| **Placement Club Admin** | `placement@aurix.com` | `placement123` |
| **Student** | `student@aurix.com` | `student123` |
