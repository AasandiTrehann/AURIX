const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'Frontend')));

const JWT_SECRET = 'aurix_super_secret_key_123!';

// DB Connection
let pool;
try {
    pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'aurixf',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('MySQL Pool created');
} catch (error) {
    console.error('Failed to create MySQL pool', error);
}

// Middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

/* =========================================================
   AUTH ROUTES
   ========================================================= */
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // Security Force: Public registration is strictly for students
        const finalRole = 'student';
        await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, finalRole]);
        res.status(201).json({ message: 'Registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        
        // Remove password from response
        const { password: _, ...userWithoutPwd } = user;
        res.json({ token, user: userWithoutPwd });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   SYSTEM ADMIN ROUTES
   ========================================================= */
// Create users with specific roles
app.post('/api/admin/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all users
app.get('/api/admin/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all events for admin (pending, published, draft, rejected, completed)
app.get('/api/admin/events', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const [events] = await pool.query('SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id ORDER BY e.event_date ASC');
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all registrations for admin analytics
app.get('/api/admin/registrations', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const [registrations] = await pool.query(`
            SELECT r.*, e.title as event_title, u.name as student_name 
            FROM registrations r 
            JOIN events e ON r.event_id = e.id 
            JOIN users u ON r.student_id = u.id 
            ORDER BY r.registered_at DESC
        `);
        res.json(registrations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a user (admin only)
app.delete('/api/admin/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a club (admin only)
app.delete('/api/clubs/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM clubs WHERE id = ?', [req.params.id]);
        res.json({ message: 'Club deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   CLUB ROUTES
   ========================================================= */
// Get my club (for club admin)
app.get('/api/my-club', authMiddleware, roleMiddleware(['club_admin']), async (req, res) => {
    try {
        const admin_id = req.user.id;
        const [clubs] = await pool.query('SELECT * FROM clubs WHERE admin_id = ?', [admin_id]);
        if (clubs.length === 0) {
            return res.status(404).json({ message: 'No club found for this admin' });
        }
        res.json(clubs[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a club (admin)
app.post('/api/clubs', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const { name, description, admin_id } = req.body;
    try {
        await pool.query('INSERT INTO clubs (name, description, admin_id) VALUES (?, ?, ?)', [name, description, admin_id]);
        res.status(201).json({ message: 'Club created' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all clubs
app.get('/api/clubs', async (req, res) => {
    try {
        const [clubs] = await pool.query('SELECT c.*, u.name as admin_name FROM clubs c LEFT JOIN users u ON c.admin_id = u.id');
        res.json(clubs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   EVENT ROUTES
   ========================================================= */
// Create event
app.post('/api/events', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    const { title, description, category, event_date, venue, status, club_id } = req.body;
    
    let finalStatus = status || 'pending';
    if (req.user.role === 'club_admin') {
        if (finalStatus === 'published') {
            finalStatus = 'pending';
        }
    }
    
    try {
        await pool.query(
            'INSERT INTO events (title, description, category, event_date, venue, status, club_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, category, event_date, venue, finalStatus, club_id]
        );
        res.status(201).json({ message: 'Event created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all published events
app.get('/api/events', async (req, res) => {
    try {
        const [events] = await pool.query('SELECT e.*, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.status = "published" ORDER BY e.event_date ASC');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get events by club
app.get('/api/clubs/:id/events', authMiddleware, async (req, res) => {
    try {
        const [events] = await pool.query('SELECT * FROM events WHERE club_id = ? ORDER BY event_date DESC', [req.params.id]);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update event
app.put('/api/events/:id', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    const { title, description, category, event_date, venue, status } = req.body;
    try {
        await pool.query(
            'UPDATE events SET title=?, description=?, category=?, event_date=?, venue=?, status=? WHERE id=?',
            [title, description, category, event_date, venue, status, req.params.id]
        );
        res.json({ message: 'Event updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete event
app.delete('/api/events/:id', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   REGISTRATION ROUTES
   ========================================================= */
// Register for event
app.post('/api/registrations', authMiddleware, roleMiddleware(['student']), async (req, res) => {
    const { event_id } = req.body;
    try {
        const student_id = req.user.id;

        // 1. Fetch event's club_id
        const [events] = await pool.query('SELECT club_id FROM events WHERE id = ?', [event_id]);
        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const club_id = events[0].club_id;

        // 2. Check if student is an approved member of this club (if event is associated with a club)
        if (club_id) {
            const [memberships] = await pool.query(
                'SELECT * FROM club_memberships WHERE student_id = ? AND club_id = ? AND status = "approved"',
                [student_id, club_id]
            );
            if (memberships.length === 0) {
                return res.status(403).json({ message: 'NOT_MEMBER' });
            }
        }

        const [existing] = await pool.query('SELECT * FROM registrations WHERE student_id=? AND event_id=?', [student_id, event_id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }
        await pool.query('INSERT INTO registrations (student_id, event_id) VALUES (?, ?)', [student_id, event_id]);
        res.status(201).json({ message: 'Registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cancel registration
app.delete('/api/registrations/:event_id', authMiddleware, roleMiddleware(['student']), async (req, res) => {
    try {
        const student_id = req.user.id;
        await pool.query('DELETE FROM registrations WHERE student_id=? AND event_id=?', [student_id, req.params.event_id]);
        res.json({ message: 'Registration cancelled' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's registrations (My Events)
app.get('/api/users/me/events', authMiddleware, roleMiddleware(['student']), async (req, res) => {
    try {
        const student_id = req.user.id;
        const [events] = await pool.query(`
            SELECT e.*, r.registered_at, r.status as reg_status, c.name as club_name
            FROM events e
            JOIN registrations r ON e.id = r.event_id
            LEFT JOIN clubs c ON e.club_id = c.id
            WHERE r.student_id = ?
            ORDER BY e.event_date ASC
        `, [student_id]);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get event registrations (For Club Admin)
app.get('/api/events/:id/registrations', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    try {
        const [registrations] = await pool.query(`
            SELECT r.*, u.name, u.email 
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            WHERE r.event_id = ?
        `, [req.params.id]);
        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   DYNAMIC CLUB SYSTEM ROUTINGS (NEW)
   ========================================================= */

// Get single club details
app.get('/api/clubs/:id', async (req, res) => {
    try {
        const [clubs] = await pool.query('SELECT c.*, u.name as admin_name FROM clubs c LEFT JOIN users u ON c.admin_id = u.id WHERE c.id = ?', [req.params.id]);
        if (clubs.length === 0) {
            return res.status(404).json({ message: 'Club not found' });
        }
        res.json(clubs[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit Join Club Request
app.post('/api/clubs/:id/join', authMiddleware, roleMiddleware(['student']), async (req, res) => {
    const { name, course, roll_number, email, reason } = req.body;
    const club_id = req.params.id;
    const student_id = req.user.id;
    try {
        // Check if there is already a membership request/active membership
        const [existing] = await pool.query('SELECT * FROM club_memberships WHERE student_id = ? AND club_id = ?', [student_id, club_id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'A membership request or membership already exists for this club.' });
        }

        await pool.query(
            'INSERT INTO club_memberships (student_id, club_id, status, student_name, course, roll_number, email, reason) VALUES (?, ?, "pending", ?, ?, ?, ?, ?)',
            [student_id, club_id, name, course, roll_number, email, reason]
        );
        res.status(201).json({ message: 'Request submitted successfully. Waiting for admin approval.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Join Club Request / Membership Status for a student
app.get('/api/clubs/:id/membership-status', authMiddleware, roleMiddleware(['student']), async (req, res) => {
    const club_id = req.params.id;
    const student_id = req.user.id;
    try {
        const [memberships] = await pool.query('SELECT status FROM club_memberships WHERE student_id = ? AND club_id = ?', [student_id, club_id]);
        if (memberships.length === 0) {
            return res.json({ status: 'none' });
        }
        res.json({ status: memberships[0].status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get pending club membership requests for the logged-in admin's club
app.get('/api/club-admin/requests', authMiddleware, roleMiddleware(['club_admin']), async (req, res) => {
    const admin_id = req.user.id;
    try {
        // Find club managed by this admin
        const [clubs] = await pool.query('SELECT id FROM clubs WHERE admin_id = ?', [admin_id]);
        if (clubs.length === 0) {
            return res.status(404).json({ message: 'No club found managed by this user' });
        }
        const club_id = clubs[0].id;

        const [requests] = await pool.query(
            'SELECT * FROM club_memberships WHERE club_id = ? AND status = "pending" ORDER BY created_at DESC',
            [club_id]
        );
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve or Reject a membership request
app.put('/api/club-admin/requests/:id', authMiddleware, roleMiddleware(['club_admin']), async (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'
    const request_id = req.params.id;
    const admin_id = req.user.id;
    try {
        // Verify this admin manages the club associated with the request
        const [clubs] = await pool.query('SELECT id FROM clubs WHERE admin_id = ?', [admin_id]);
        if (clubs.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const club_id = clubs[0].id;

        const [request] = await pool.query('SELECT * FROM club_memberships WHERE id = ? AND club_id = ?', [request_id, club_id]);
        if (request.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await pool.query('UPDATE club_memberships SET status = ? WHERE id = ?', [status, request_id]);
        res.json({ message: `Request has been ${status}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* =========================================================
   ANNOUNCEMENTS ROUTES (NEW)
   ========================================================= */

// Create a new announcement (Club Admin only)
app.post('/api/announcements', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    const { title, content } = req.body;
    const admin_id = req.user.id;
    try {
        // Find club managed by this admin
        const [clubs] = await pool.query('SELECT id FROM clubs WHERE admin_id = ?', [admin_id]);
        if (clubs.length === 0) {
            return res.status(404).json({ message: 'No club found managed by this admin account' });
        }
        const club_id = clubs[0].id;

        await pool.query(
            'INSERT INTO announcements (title, content, club_id) VALUES (?, ?, ?)',
            [title, content, club_id]
        );
        res.status(201).json({ message: 'Announcement published successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all announcements (for student board view)
app.get('/api/announcements', async (req, res) => {
    try {
        const [announcements] = await pool.query(`
            SELECT a.*, c.name as club_name 
            FROM announcements a 
            JOIN clubs c ON a.club_id = c.id 
            ORDER BY a.created_at DESC
        `);
        res.json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get announcements for a specific club
app.get('/api/clubs/:id/announcements', async (req, res) => {
    try {
        const [announcements] = await pool.query(
            'SELECT * FROM announcements WHERE club_id = ? ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete an announcement (Club Admin only)
app.delete('/api/announcements/:id', authMiddleware, roleMiddleware(['club_admin', 'admin']), async (req, res) => {
    const announcement_id = req.params.id;
    const admin_id = req.user.id;
    try {
        // Find club managed by this admin
        const [clubs] = await pool.query('SELECT id FROM clubs WHERE admin_id = ?', [admin_id]);
        if (clubs.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const club_id = clubs[0].id;

        // Verify announcement belongs to this club
        const [announcements] = await pool.query(
            'SELECT * FROM announcements WHERE id = ? AND club_id = ?',
            [announcement_id, club_id]
        );
        if (announcements.length === 0) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        await pool.query('DELETE FROM announcements WHERE id = ?', [announcement_id]);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Fallback to index.html for unknown routes if it's not starting with api/
app.use((req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
    } else {
        res.status(404).json({ message: 'API Route Not Found' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
