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
                image_url VARCHAR(255) DEFAULT NULL,
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

        // Alter Events Table image_url column in case it already exists but lacks it
        try {
            await connection.query(`
                ALTER TABLE events ADD COLUMN image_url VARCHAR(255) DEFAULT NULL
            `);
            console.log('Added image_url column to events table.');
        } catch (err) {
            // column might already exist, which is fine
        }

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
            { name: 'Student John', email: 'student@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-001' },
            { name: 'Rahul Sharma', email: 'rahul@gmail.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-042' },
            { name: 'Aisha Khan', email: 'aish@gmail.com', password: 'admin123', course: 'BTech ECE', roll_number: 'ECE2026-085' },
            { name: 'Liam Chen', email: 'liam.chen@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-010' },
            { name: 'Sophia Patel', email: 'sophia.patel@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-011' },
            { name: 'Marcus Johnson', email: 'marcus.j@aurix.com', password: 'admin123', course: 'BTech IT', roll_number: 'IT2026-012' },
            { name: 'Emma Davis', email: 'emma.davis@aurix.com', password: 'admin123', course: 'BTech ECE', roll_number: 'ECE2026-013' },
            { name: 'Aarav Mehta', email: 'aarav.mehta@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-014' },
            { name: 'Olivia Smith', email: 'olivia.smith@aurix.com', password: 'admin123', course: 'BTech Biotech', roll_number: 'BT2026-015' },
            { name: 'Lucas Silva', email: 'lucas.silva@aurix.com', password: 'admin123', course: 'BTech ME', roll_number: 'ME2026-016' },
            { name: 'Amara Okafor', email: 'amara.o@aurix.com', password: 'admin123', course: 'BTech EE', roll_number: 'EE2026-017' },
            { name: 'Yuki Tanaka', email: 'yuki.tanaka@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-018' },
            { name: 'Ethan Brown', email: 'ethan.brown@aurix.com', password: 'admin123', course: 'BTech IT', roll_number: 'IT2026-019' },
            { name: 'Zoe Garcia', email: 'zoe.garcia@aurix.com', password: 'admin123', course: 'BTech ECE', roll_number: 'ECE2026-020' },
            { name: 'Noah Wilson', email: 'noah.wilson@aurix.com', password: 'admin123', course: 'BTech CSE', roll_number: 'CSE2026-021' },
            { name: 'Mia Martinez', email: 'mia.m@aurix.com', password: 'admin123', course: 'BTech Biotech', roll_number: 'BT2026-022' },
            { name: 'Leo Dubois', email: 'leo.dubois@aurix.com', password: 'admin123', course: 'BTech ME', roll_number: 'ME2026-023' },
            { name: 'Chloe Taylor', email: 'chloe.taylor@aurix.com', password: 'admin123', course: 'BTech EE', roll_number: 'EE2026-024' }
        ];

        const seededStudents = [];
        const hashedPassword = await bcrypt.hash('admin123', 10);

        for (const student of students) {
            const [result] = await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "student")',
                [student.name, student.email, hashedPassword]
            );
            const studentId = result.insertId;
            console.log(`Created student user: ${student.email}`);
            seededStudents.push({
                id: studentId,
                name: student.name,
                email: student.email,
                course: student.course,
                roll_number: student.roll_number
            });
        }

        // 3. Fetch clubs to resolve IDs
        const [allClubs] = await connection.query('SELECT id, name FROM clubs');
        const clubMap = {};
        allClubs.forEach(c => {
            clubMap[c.name] = c.id;
        });

        // 4. Seed Club Events (5 events per club)
        const today = new Date();
        const addDays = (days) => {
            const d = new Date();
            d.setDate(today.getDate() + days);
            return d.toISOString().slice(0, 19).replace('T', ' ');
        };
        const getLiveEventDate = () => {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} 23:59:59`;
        };

        const eventsToSeed = [
            // Coding Club
            { title: 'Weekly Code Sprint', description: 'Participate in our weekly 2-hour algorithm challenge. Test your speed and efficiency in competitive programming.', category: 'Coding', event_date: getLiveEventDate(), venue: 'Lab 3', status: 'published', club_name: 'Coding Club', image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97' },
            { title: 'AURIX Hackathon 2026', description: 'A 24-hour coding sprint where teams collaborate to build innovative web and software applications from scratch.', category: 'Coding', event_date: addDays(5), venue: 'Main Auditorium', status: 'published', club_name: 'Coding Club', image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d' },
            { title: 'Code Golf Challenge', description: 'Write the shortest possible code to solve algorithm problems. Fun, fast-paced, and highly competitive!', category: 'Coding', event_date: addDays(-3), venue: 'Lab 3', status: 'published', club_name: 'Coding Club', image_url: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3' },
            { title: 'Web Dev HackDay', description: 'A day-long workshop and contest to design and build responsive single-page applications using modern frameworks.', category: 'Coding', event_date: addDays(4), venue: 'Lab 2', status: 'pending', club_name: 'Coding Club', image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12' },
            { title: 'Bug Hunting Contest', description: 'Find and patch security vulnerabilities and logical errors in a pre-built web application.', category: 'Coding', event_date: addDays(7), venue: 'Lab 1', status: 'rejected', club_name: 'Coding Club', image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },

            // Cultural Club
            { title: 'Campus Dance Battle', description: 'Prepare for an energetic dance face-off between different branches! Solo and group dance formats.', category: 'Cultural', event_date: addDays(3), venue: 'Open Air Theatre', status: 'published', club_name: 'Cultural Club', image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad' },
            { title: 'Symphony Music Night', description: 'A relaxing night of live classical and modern instrumental performances by student musicians.', category: 'Cultural', event_date: addDays(-1), venue: 'Amphitheatre', status: 'published', club_name: 'Cultural Club', image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629' },
            { title: 'Art & Sketching Exhibition', description: 'Showcase your fine arts talent! Live canvas painting and open gallery for visitor voting.', category: 'Cultural', event_date: addDays(6), venue: 'Admin Block Lobby', status: 'published', club_name: 'Cultural Club', image_url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b' },
            { title: 'Street Play (Nukkad Natak)', description: 'A powerful street theatre drama highlighting social awareness and community development issues.', category: 'Cultural', event_date: getLiveEventDate(), venue: 'Canteen Square', status: 'published', club_name: 'Cultural Club', image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf' },
            { title: 'Drama Fest 2026', description: 'An evening of short plays, stand-up comedy, and monologues performed by the drama troupe.', category: 'Cultural', event_date: addDays(8), venue: 'Main Auditorium', status: 'draft', club_name: 'Cultural Club', image_url: 'https://images.unsplash.com/photo-1503095391757-11200df53974' },

            // Entrepreneurship Club
            { title: 'Startup Pitch Fest', description: 'Present your startup ideas in front of venture capitalists and industry mentors. Incubation grants up to $10,000!', category: 'Business', event_date: addDays(4), venue: 'Seminar Room 1', status: 'published', club_name: 'Entrepreneurship Club', image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2' },
            { title: 'Ideation Workshop', description: 'Learn design thinking, market validation, and customer discovery techniques to refine raw business ideas.', category: 'Business', event_date: addDays(-5), venue: 'Seminar Room 2', status: 'published', club_name: 'Entrepreneurship Club', image_url: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83' },
            { title: 'Angel Investors Round Table', description: 'An exclusive panel discussion with active angel investors discussing the current venture funding landscape.', category: 'Business', event_date: addDays(9), venue: 'Executive Hall', status: 'published', club_name: 'Entrepreneurship Club', image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7' },
            { title: 'E-Summit 2026', description: 'Our annual flagship entrepreneurship summit featuring keynote speakers, panels, and networking zones.', category: 'Business', event_date: getLiveEventDate(), venue: 'Main Auditorium', status: 'published', club_name: 'Entrepreneurship Club', image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87' },
            { title: 'Case Study Competition', description: 'Deconstruct a real-world business failure and pitch a turnaround strategy to a panel of expert judges.', category: 'Business', event_date: addDays(6), venue: 'draft', status: 'draft', club_name: 'Entrepreneurship Club', image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173' },

            // Technical Club
            { title: 'Machine Learning Bootcamp', description: 'Hands-on training session covering regression, decision trees, neural networks, and model deployment.', category: 'Technical', event_date: getLiveEventDate(), venue: 'Lab 4', status: 'published', club_name: 'Technical Club', image_url: 'https://images.unsplash.com/photo-1527474305487-b87b222841cc' },
            { title: 'Robotics Exhibition', description: 'Check out automated line-followers, obstacle-avoiding drones, and pick-and-place arms designed by technical students.', category: 'Technical', event_date: addDays(6), venue: 'Mechanical Block', status: 'published', club_name: 'Technical Club', image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e' },
            { title: 'IoT Hack-a-thon', description: 'Build smart hardware systems using microcontrollers, sensors, and cloud communication protocols within 18 hours.', category: 'Technical', event_date: addDays(-2), venue: 'Lab 5', status: 'published', club_name: 'Technical Club', image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
            { title: 'Drone Racing Championship', description: 'Watch customized multi-rotors navigate an indoor obstacle course in a high-speed time trial.', category: 'Technical', event_date: addDays(5), venue: 'College Ground', status: 'pending', club_name: 'Technical Club', image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e' },
            { title: 'Cybersecurity Capture The Flag', description: 'Jeopardy-style hacking competition targeting reverse engineering, cryptography, and web security.', category: 'Technical', event_date: addDays(8), venue: 'Lab 4', status: 'rejected', club_name: 'Technical Club', image_url: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87' },

            // Placement Club
            { title: 'Mock Interview Prep', description: 'Practice live mock technical and HR interviews with industry experts and alumni before placement season.', category: 'Placement', event_date: getLiveEventDate(), venue: 'Placement Cell', status: 'published', club_name: 'Placement Club', image_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e' },
            { title: 'Resume Review Workshop', description: 'One-on-one resume formatting checks, word choices, and structure tuning to pass ATS filters.', category: 'Placement', event_date: addDays(-2), venue: 'Placement Cell', status: 'published', club_name: 'Placement Club', image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40' },
            { title: 'HR Panel Discussion', description: 'Interactive Q&A session with HR directors discussing recruiter expectations, trends, and compensation negotiation.', category: 'Placement', event_date: addDays(7), venue: 'Seminar Room 2', status: 'published', club_name: 'Placement Club', image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b' },
            { title: 'Group Discussion Training', description: 'Learn frameworks to structure points, moderate discussions, and stand out in placement GD rounds.', category: 'Placement', event_date: addDays(3), venue: 'Placement Cell Room B', status: 'pending', club_name: 'Placement Club', image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c' },
            { title: 'Placement Talk by FAANG Alumni', description: 'Insider tips on cracking placement interviews and internships at top tier tech companies.', category: 'Placement', event_date: addDays(10), venue: 'draft', club_name: 'Placement Club', image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4' }
        ];

        const seededEvents = [];

        for (const ev of eventsToSeed) {
            const clubId = clubMap[ev.club_name];
            if (!clubId) continue;

            const [result] = await connection.query(
                'INSERT INTO events (title, description, category, event_date, venue, status, club_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ev.title, ev.description, ev.category, ev.event_date, ev.venue, ev.status, clubId, ev.image_url]
            );
            const eventId = result.insertId;
            seededEvents.push({
                id: eventId,
                title: ev.title,
                club_name: ev.club_name,
                club_id: clubId,
                status: ev.status
            });
            console.log(`Created event: ${ev.title}`);
        }

        // 5. Seed Club Memberships & Pending Join Requests
        console.log('Seeding club memberships...');
        const clubsArray = allClubs;

        for (let i = 0; i < seededStudents.length; i++) {
            const student = seededStudents[i];
            
            // Assign 1-2 approved clubs based on student index to ensure even distribution
            const primaryClubIndex = i % clubsArray.length;
            const secondaryClubIndex = (i + 2) % clubsArray.length;

            const approvedClubs = [clubsArray[primaryClubIndex]];
            if (primaryClubIndex !== secondaryClubIndex) {
                approvedClubs.push(clubsArray[secondaryClubIndex]);
            }

            for (const club of approvedClubs) {
                await connection.query(
                    'INSERT INTO club_memberships (student_id, club_id, status, student_name, course, roll_number, email, reason) VALUES (?, ?, "approved", ?, ?, ?, ?, "Excited to join and contribute to this club!")',
                    [student.id, club.id, student.name, student.course, student.roll_number, student.email]
                );
                console.log(`Created approved membership for ${student.name} in ${club.name}`);
            }

            // Create some pending membership requests (requests) to show in the club admin dashboards!
            if (i % 2 === 0) {
                const pendingClubIndex = (i + 4) % clubsArray.length;
                const pendingClub = clubsArray[pendingClubIndex];
                if (!approvedClubs.some(c => c.id === pendingClub.id)) {
                    await connection.query(
                        'INSERT INTO club_memberships (student_id, club_id, status, student_name, course, roll_number, email, reason) VALUES (?, ?, "pending", ?, ?, ?, ?, "I want to learn new skills and participate in club activities.")',
                        [student.id, pendingClub.id, student.name, student.course, student.roll_number, student.email]
                    );
                    console.log(`Created pending membership request for ${student.name} in ${pendingClub.name}`);
                }
            }

            // Create some rejected membership requests
            if (i % 3 === 0) {
                const rejectedClubIndex = (i + 1) % clubsArray.length;
                const rejectedClub = clubsArray[rejectedClubIndex];
                if (!approvedClubs.some(c => c.id === rejectedClub.id)) {
                    await connection.query(
                        'INSERT INTO club_memberships (student_id, club_id, status, student_name, course, roll_number, email, reason) VALUES (?, ?, "rejected", ?, ?, ?, ?, "Testing rejected status.")',
                        [student.id, rejectedClub.id, student.name, student.course, student.roll_number, student.email]
                    );
                    console.log(`Created rejected membership request for ${student.name} in ${rejectedClub.name}`);
                }
            }
        }

        // 6. Seed Event Registrations
        console.log('Seeding event registrations...');

        // Fetch all approved memberships to map which student is in which club
        const [approvedMemberships] = await connection.query('SELECT student_id, club_id FROM club_memberships WHERE status = "approved"');
        
        // Group approved memberships by student_id
        const studentToClubsMap = {};
        approvedMemberships.forEach(m => {
            if (!studentToClubsMap[m.student_id]) {
                studentToClubsMap[m.student_id] = [];
            }
            studentToClubsMap[m.student_id].push(m.club_id);
        });

        // Loop through all students, and register them for some published/completed events of their approved clubs
        for (const student of seededStudents) {
            const memberClubIds = studentToClubsMap[student.id] || [];
            if (memberClubIds.length === 0) continue;

            // Find events for these clubs
            const eligibleEvents = seededEvents.filter(ev => memberClubIds.includes(ev.club_id) && (ev.status === 'published' || ev.status === 'completed'));
            
            // Register for 1-3 events
            const numRegs = Math.min(eligibleEvents.length, 1 + (student.id % 3));
            const registeredEventIds = new Set();

            for (let r = 0; r < numRegs; r++) {
                const eventIndex = (student.id + r) % eligibleEvents.length;
                const targetEvent = eligibleEvents[eventIndex];
                
                if (targetEvent && !registeredEventIds.has(targetEvent.id)) {
                    registeredEventIds.add(targetEvent.id);
                    await connection.query(
                        'INSERT INTO registrations (student_id, event_id, status) VALUES (?, ?, "registered")',
                        [student.id, targetEvent.id]
                    );
                    console.log(`Created registration for ${student.name} in event: ${targetEvent.title}`);
                }
            }
        }

        console.log('Database setup complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error setting up DB:', err);
        process.exit(1);
    }
};

setup();
