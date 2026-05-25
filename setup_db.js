const mysql = require('mysql2/promise');

const setup = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
        });

        console.log('Connected to MySQL server.');

        // Create Database
        await connection.query('CREATE DATABASE IF NOT EXISTS aurixf');
        console.log('Database aurixf created or already exists.');

        await connection.query('USE aurixf');

        // Create Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('student', 'club_admin', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('users table created.');

        // Create Clubs Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS clubs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                admin_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('clubs table created.');

        // Create Events Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                event_date DATETIME,
                venue VARCHAR(100),
                status ENUM('draft', 'pending', 'published', 'rejected', 'completed') DEFAULT 'pending',
                club_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
            )
        `);
        console.log('events table created.');

        // Alter Events Table status column in case it already exists
        await connection.query(`
            ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'pending', 'published', 'rejected', 'completed') DEFAULT 'pending'
        `);
        console.log('events table status column altered successfully.');

        // Create Registrations Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                event_id INT NOT NULL,
                status ENUM('registered', 'cancelled') DEFAULT 'registered',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        `);
        console.log('registrations table created.');

        // Create Club Memberships Table (Join Requests)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS club_memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                club_id INT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                student_name VARCHAR(100) NOT NULL,
                course VARCHAR(100) NOT NULL,
                roll_number VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
            )
        `);
        console.log('club_memberships table created.');

        // Create Announcements Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                content TEXT NOT NULL,
                club_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
            )
        `);
        console.log('announcements table created.');

        // 1. Clear all old records for clean re-seeding
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE registrations');
        await connection.query('TRUNCATE TABLE club_memberships');
        await connection.query('TRUNCATE TABLE announcements');
        await connection.query('TRUNCATE TABLE events');
        await connection.query('TRUNCATE TABLE clubs');
        await connection.query('TRUNCATE TABLE users');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Cleared all tables for clean re-seeding.');

        const bcrypt = require('bcrypt');

        // Seed System Admin
        const systemAdminPassword = await bcrypt.hash('admin123', 10);
        await connection.query(
            "INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@aurix.com', ?, 'admin')",
            [systemAdminPassword]
        );
        console.log('Seeded System Admin user: admin@aurix.com');

        // Seed Club Admins and Clubs
        const admins = [
            { name: 'Cultural Admin', email: 'cultural_admin@college.com', password: 'admin123', clubName: 'Cultural Club', description: 'The Cultural Club is the heart of creativity, artistic expression, and cultural heritage on campus. We organize dance showcases, music concerts, theatrical plays, and visual arts exhibitions. Our mission is to celebrate diversity, nurture talent, and foster a vibrant community where students can express their artistic passions.' },
            { name: 'Coding Admin', email: 'coding_admin@college.com', password: 'admin123', clubName: 'Coding Club', description: 'The Coding Club is a community of developers, programmers, and open-source contributors. We host weekly coding contests, hands-on workshops in web and mobile development, and collaborate on exciting real-world projects. Whether you are a beginner writing your first line of code or a competitive programmer, this is the place to grow.' },
            { name: 'Entrepreneurship Admin', email: 'ent_admin@college.com', password: 'admin123', clubName: 'Entrepreneurship Club', description: 'The Entrepreneurship Club (E-Club) inspires innovation, business acumen, and leadership. We run startup incubation programs, pitch competitions, guest lectures from successful startup founders, and design-thinking workshops. We provide resources, mentorship, and a network for student founders to turn ideas into viable ventures.' },
            { name: 'Technical Club Admin', email: 'tech_admin@college.com', password: 'admin123', clubName: 'Technical Club', description: 'The Technical Club focuses on cutting-edge engineering disciplines, including Robotics, Artificial Intelligence, IoT, and Cybersecurity. We participate in national-level robotics challenges, build drone prototypes, and conduct machine learning workshops. Join us to bridge the gap between theoretical knowledge and hands-on hardware/software engineering.' },
            { name: 'Placement Club Admin', email: 'placement_admin@college.com', password: 'admin123', clubName: 'Placement Club', description: 'The Placement Club is dedicated to career readiness, interview preparation, and professional development. We conduct resume-building clinics, mock technical/HR interviews, and placement orientation talks. We also coordinate with industry recruiters to bring internships, job opportunities, and networking events directly to our campus.' }
        ];

        for (const admin of admins) {
            const hashedPassword = await bcrypt.hash(admin.password, 10);
            
            const [userResult] = await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "club_admin")',
                [admin.name, admin.email, hashedPassword]
            );
            const adminId = userResult.insertId;
            console.log(`Created admin user: ${admin.email}`);

            await connection.query(
                'INSERT INTO clubs (name, description, admin_id) VALUES (?, ?, ?)',
                [admin.clubName, admin.description, adminId]
            );
            console.log(`Created club: ${admin.clubName}`);
        }

        // 2. Seed Student Users
        const students = [
            { name: 'Student John', email: 'student@aurix.com', password: 'admin123' },
            { name: 'Rahul Sharma', email: 'rahul@gmail.com', password: 'admin123' },
            { name: 'Aisha Khan', email: 'aish@gmail.com', password: 'admin123' }
        ];

        const seededStudentIds = {};

        for (const student of students) {
            const hashedPassword = await bcrypt.hash(student.password, 10);
            const [result] = await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "student")',
                [student.name, student.email, hashedPassword]
            );
            const studentId = result.insertId;
            console.log(`Created student user: ${student.email}`);
            seededStudentIds[student.email] = studentId;
        }


        // 3. Fetch clubs to resolve IDs
        const [allClubs] = await connection.query('SELECT id, name FROM clubs');
        const clubMap = {};
        allClubs.forEach(c => {
            clubMap[c.name] = c.id;
        });

        // 4. Seed Club Events
        const today = new Date();
        const addDays = (days) => {
            const d = new Date();
            d.setDate(today.getDate() + days);
            return d.toISOString().slice(0, 19).replace('T', ' ');
        };

        const eventsToSeed = [
            { title: 'Weekly Code Sprint', description: 'Participate in our weekly 2-hour algorithm challenge. Test your speed and efficiency in competitive programming.', category: 'Coding', event_date: addDays(2), venue: 'Lab 3', status: 'published', club_name: 'Coding Club' },
            { title: 'AURIX Hackathon 2026', description: 'A 24-hour coding sprint where teams collaborate to build innovative web and software applications from scratch.', category: 'Coding', event_date: addDays(5), venue: 'Main Auditorium', status: 'published', club_name: 'Coding Club' },
            { title: 'Campus Dance Battle', description: 'Prepare for an energetic dance face-off between different branches! Solo and group dance formats.', category: 'Cultural', event_date: addDays(3), venue: 'Open Air Theatre', status: 'published', club_name: 'Cultural Club' },
            { title: 'Symphony Music Night', description: 'A relaxing night of live classical and modern instrumental performances by student musicians.', category: 'Cultural', event_date: addDays(-1), venue: 'Amphitheatre', status: 'completed', club_name: 'Cultural Club' },
            { title: 'Startup Pitch Fest', description: 'Present your startup ideas in front of venture capitalists and industry mentors. Incubation grants up to $10,000!', category: 'Business', event_date: addDays(4), venue: 'Seminar Room 1', status: 'published', club_name: 'Entrepreneurship Club' },
            { title: 'Machine Learning Bootcamp', description: 'Hands-on training session covering regression, decision trees, neural networks, and model deployment.', category: 'Technical', event_date: addDays(1), venue: 'Lab 4', status: 'published', club_name: 'Technical Club' },
            { title: 'Robotics Exhibition', description: 'Check out automated line-followers, obstacle-avoiding drones, and pick-and-place arms designed by technical students.', category: 'Technical', event_date: addDays(6), venue: 'Mechanical Block', status: 'published', club_name: 'Technical Club' },
            { title: 'Mock Interview Prep', description: 'Practice live mock technical and HR interviews with industry experts and alumni before placement season.', category: 'Placement', event_date: addDays(2), venue: 'Placement Cell', status: 'published', club_name: 'Placement Club' },
            { title: 'Resume Review Workshop', description: 'One-on-one resume formatting checks, word choices, and structure tuning to pass ATS filters.', category: 'Placement', event_date: addDays(-2), venue: 'Placement Cell', status: 'completed', club_name: 'Placement Club' }
        ];

        const seededEventIds = {};

        for (const ev of eventsToSeed) {
            const clubId = clubMap[ev.club_name];
            if (!clubId) continue;

            const [result] = await connection.query(
                'INSERT INTO events (title, description, category, event_date, venue, status, club_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [ev.title, ev.description, ev.category, ev.event_date, ev.venue, ev.status, clubId]
            );
            seededEventIds[ev.title] = result.insertId;
            console.log(`Created event: ${ev.title}`);
        }

        // 5. Seed Club Memberships (approved applications)
        const membershipsToSeed = [
            { email: 'rahul@gmail.com', student_name: 'Rahul Sharma', course: 'BTech CSE', roll_number: 'CSE2026-042', club_name: 'Coding Club', status: 'approved' },
            { email: 'rahul@gmail.com', student_name: 'Rahul Sharma', course: 'BTech CSE', roll_number: 'CSE2026-042', club_name: 'Technical Club', status: 'approved' },
            { email: 'aish@gmail.com', student_name: 'Aisha Khan', course: 'BTech ECE', roll_number: 'ECE2026-085', club_name: 'Cultural Club', status: 'approved' },
            { email: 'aish@gmail.com', student_name: 'Aisha Khan', course: 'BTech ECE', roll_number: 'ECE2026-085', club_name: 'Placement Club', status: 'approved' },
            { email: 'student@aurix.com', student_name: 'Student John', course: 'BTech CSE', roll_number: 'CSE2026-001', club_name: 'Coding Club', status: 'approved' },
            { email: 'student@aurix.com', student_name: 'Student John', course: 'BTech CSE', roll_number: 'CSE2026-001', club_name: 'Cultural Club', status: 'approved' },
            { email: 'student@aurix.com', student_name: 'Student John', course: 'BTech CSE', roll_number: 'CSE2026-001', club_name: 'Entrepreneurship Club', status: 'approved' }
        ];

        for (const mem of membershipsToSeed) {
            const studentId = seededStudentIds[mem.email];
            const clubId = clubMap[mem.club_name];
            if (!studentId || !clubId) continue;

            await connection.query(
                'INSERT INTO club_memberships (student_id, club_id, status, student_name, course, roll_number, email, reason) VALUES (?, ?, ?, ?, ?, ?, ?, "Interest in club activities.")',
                [studentId, clubId, mem.status, mem.student_name, mem.course, mem.roll_number, mem.email]
            );
            console.log(`Created membership for ${mem.student_name} in ${mem.club_name}`);
        }

        // 6. Seed Event Registrations
        const registrationsToSeed = [
            { email: 'rahul@gmail.com', event_title: 'Weekly Code Sprint' },
            { email: 'rahul@gmail.com', event_title: 'Machine Learning Bootcamp' },
            { email: 'aish@gmail.com', event_title: 'Campus Dance Battle' },
            { email: 'student@aurix.com', event_title: 'AURIX Hackathon 2026' },
            { email: 'student@aurix.com', event_title: 'Startup Pitch Fest' }
        ];

        for (const reg of registrationsToSeed) {
            const studentId = seededStudentIds[reg.email];
            const eventId = seededEventIds[reg.event_title];
            if (!studentId || !eventId) continue;

            await connection.query(
                'INSERT INTO registrations (student_id, event_id, status) VALUES (?, ?, "registered")',
                [studentId, eventId]
            );
            console.log(`Created registration for ${reg.email} to ${reg.event_title}`);
        }

        console.log('Database setup complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error setting up DB:', err);
        process.exit(1);
    }
};

setup();
