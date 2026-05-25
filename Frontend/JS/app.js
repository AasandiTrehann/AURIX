/* =====================================================
   🚀 AURIX FINAL JS (LOCKED VERSION)
   - Single file (no split needed now)
   - Backend-ready
   - Safe on all pages
   - No duplicates
   ===================================================== */

console.log("AURIX JS LOADED 🚀");

/* ================= SAFE ANGULAR INIT ================= */
let app = null;
if (typeof angular !== "undefined") {
    app = angular.module("aurixApp", []);
}

/* =====================================================
   🧩 UTILITY FUNCTIONS
   ===================================================== */

/* Loading Button */
function setLoading(btn, state) {
    if (!btn) return;
    btn.classList.toggle("loading", state);
}

/* Safe Element Getter */
function $(id) {
    return document.getElementById(id);
}

/* =====================================================
   🔐 AUTH CONTROLLERS (Angular)
   ===================================================== */

if (app) {

    /* ===== REGISTER ===== */
    app.controller("RegisterController", function($scope, $timeout) {

        $scope.register = function() {
            const btn = $("registerBtn");
            setLoading(btn, true);

            $timeout(() => {
                setLoading(btn, false);

                // 🔥 Backend hook here later
                // fetch('/api/register')

                window.location.href = "login.html";
            }, 1200);
        };

    });

    /* ===== LOGIN ===== */
    app.controller("LoginController", function($scope, $timeout) {

        $scope.login = function() {
            const btn = $("loginBtn");
            setLoading(btn, true);

            $timeout(() => {
                setLoading(btn, false);

                /* 🔥 ROLE BASED REDIRECT (backend will replace this) */
                const role = "student"; 

                switch(role) {
                    case "admin":
                        window.location.href = "admin/systemadmin_dashboard.html";
                        break;
                    case "club":
                        window.location.href = "clubadmin/clubadmin_dashboard.html";
                        break;
                    default:
                        window.location.href = "student/student-dashboard.html";
                }

            }, 1000);
        };

    });

}

/* =====================================================
   🧭 NAVIGATION
   ===================================================== */

function handleNav(event, el) {
    if (!el) return;

    event.preventDefault();
    const link = el.getAttribute("href");

    if (!link) return;

    el.classList.add("loading");

    setTimeout(() => {
        window.location.href = link;
    }, 400);
}

/* Logout */
function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Check if we are in a subfolder
    const path = window.location.pathname;
    if (path.includes("_folder") || path.includes("/admin") || path.includes("/student") || path.includes("/club")) {
        window.location.href = "../login.html";
    } else {
        window.location.href = "login.html";
    }
}

/* =====================================================
   📂 SIDEBAR + UI CONTROLS
   ===================================================== */

function toggleSidebar() {
    const sidebar = $("sidebar");
    const overlay = $("overlay");

    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

function closeSidebar() {
    const sidebar = $("sidebar");
    const overlay = $("overlay");

    if (sidebar) sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
}

/* Dropdowns */
function toggleBranch() {
    const el = $("branchMenu");
    if (el) el.classList.toggle("hidden");
}

function toggleClubs() {
    const el = $("clubMenu");
    if (el) el.classList.toggle("hidden");
}

/* =====================================================
   🎯 EVENTS
   ===================================================== */

/* Open event page */
function openEvent() {
    window.location.href = "event-details.html";
}

/* =====================================================
   🔍 FILTER SYSTEM (REUSABLE)
   ===================================================== */

function filterUsers(role) {
    const rows = document.querySelectorAll("tbody tr");

    rows.forEach(row => {
        const r = row.getAttribute("data-role");
        row.style.display = (role === "all" || r === role) ? "" : "none";
    });
}

/* =====================================================
   ✨ ANIMATIONS
   ===================================================== */

/* Scroll reveal */
function revealOnScroll() {
    const elements = document.querySelectorAll(".reveal");

    elements.forEach(el => {
        const top = el.getBoundingClientRect().top;

        if (top < window.innerHeight - 100) {
            el.classList.add("active");
        }
    });
}

/* Stats counter */
function animateStats() {
    const stats = document.querySelectorAll(".stat-card h3");

    if (!stats.length) return;

    stats.forEach(el => {
        const target = parseInt(el.innerText);
        let count = 0;

        const step = Math.ceil(target / 40);

        const interval = setInterval(() => {
            count += step;
            if (count >= target) {
                el.innerText = target;
                clearInterval(interval);
            } else {
                el.innerText = count;
            }
        }, 20);
    });
}

/* =====================================================
   ⌨️ UX ENHANCEMENTS
   ===================================================== */

/* Enter key login */
document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        const btn = $("loginBtn");
        if (btn && document.activeElement.tagName === "INPUT") {
            btn.click();
        }
    }
});

/* =====================================================
   🌌 INIT (RUN ON LOAD)
   ===================================================== */

window.addEventListener("load", function () {

    /* Scroll animation */
    revealOnScroll();

    /* Stats animation */
    animateStats();

    /* Particles */
    if (typeof particlesJS !== "undefined") {
        particlesJS("particles-js", {
            particles: {
                number: { value: 70 },
                size: { value: 3 },
                move: { speed: 1.2 },
                line_linked: {
                    enable: true,
                    distance: 140,
                    opacity: 0.15
                },
                color: { value: "#a78bfa" }
            }
        });
    }

});

/* Scroll listener */
window.addEventListener("scroll", revealOnScroll);

/* =====================================================
   🔄 DYNAMIC SIDEBAR & NAV STATE INJECTION (ALL PAGES)
   ===================================================== */
function initLayout() {
    // 1. Resolve paths depending on if we are in a subfolder
    const isSubfolder = window.location.pathname.includes("student_folder") || 
                        window.location.pathname.includes("clubadmin_folder") || 
                        window.location.pathname.includes("systemadmin_folder");
    
    const prefix = isSubfolder ? "../" : "";

    // 2. Load FontAwesome CSS from cdnjs (highly reliable fallback/override)
    if (!document.querySelector('link[href*="cdnjs.cloudflare.com/ajax/libs/font-awesome"]')) {
        const faLink = document.createElement("link");
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        document.head.appendChild(faLink);
    }

    // 3. Create or update sidebar element
    let sidebar = document.getElementById("sidebar");
    if (!sidebar) {
        sidebar = document.createElement("div");
        sidebar.className = "sidebar";
        sidebar.id = "sidebar";
        document.body.appendChild(sidebar);
    }

    // 4. Create or update overlay element
    let overlay = document.getElementById("overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.id = "overlay";
        overlay.setAttribute("onclick", "closeSidebar()");
        document.body.appendChild(overlay);
    }

    // 5. Render appropriate links based on login state
    const user = JSON.parse(localStorage.getItem("user"));
    let announcementsUrl = `${prefix}login.html`;

    if (user) {
        let dashboardUrl = `${prefix}student_folder/student-dashboard.html`;
        let myEventsUrl = `${prefix}student_folder/my_events.html`;
        let clubsUrl = `${prefix}student_folder/club-page.html`;
        announcementsUrl = `${prefix}student_folder/announcements.html`;

        if (user.role === "club_admin") {
            dashboardUrl = `${prefix}clubadmin_folder/clubadmin_dashboard.html`;
            myEventsUrl = `${prefix}clubadmin_folder/manage-events.html`;
            clubsUrl = `${prefix}clubadmin_folder/clubadmin_dashboard.html`;
            announcementsUrl = `${prefix}clubadmin_folder/announcements.html`;
        } else if (user.role === "admin") {
            dashboardUrl = `${prefix}systemadmin_folder/admin-dashboard.html`;
            myEventsUrl = `${prefix}systemadmin_folder/approve-events.html`;
            clubsUrl = `${prefix}systemadmin_folder/manage_clubs.html`;
            announcementsUrl = `${prefix}student_folder/announcements.html`;
        }

        sidebar.innerHTML = `
            <h3>👋 ${user.name}</h3>
            <a href="${prefix}index.html">🏠 Home</a>
            <a href="${dashboardUrl}">👤 Profile/Dashboard</a>
            <a href="${myEventsUrl}">📅 My Events</a>
            <a href="${clubsUrl}">👥 Clubs</a>
            <a href="${announcementsUrl}">📢 Announcements</a>
            <hr>
            <a onclick="logout()" style="cursor: pointer;">🚪 Logout</a>
        `;

        // Update nav links on root files
        const navLinks = document.querySelector(".nav-links");
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="${prefix}index.html">Home</a>
                <a href="${dashboardUrl}">Dashboard</a>
                <a href="#" onclick="logout()">Logout</a>
            `;
        }
    } else {
        sidebar.innerHTML = `
            <h3>Menu</h3>
            <a href="${prefix}index.html">🏠 Home</a>
            <a href="${prefix}login.html">👤 Profile</a>
            <a href="${prefix}login.html">📅 My Events</a>
            <a href="${prefix}login.html">👥 Clubs</a>
            <a href="${prefix}login.html">📢 Announcements</a>
            <hr>
            <a href="${prefix}login.html">🚪 Login / Register</a>
        `;
    }

    // Dynamic Topbar Announcements Link Update
    const topLinks = document.querySelectorAll(".menu a, .nav-links a");
    topLinks.forEach(link => {
        if (link.textContent.trim().toLowerCase() === "announcements") {
            link.href = announcementsUrl;
        }
    });

    // 6. Ensure Hamburger Icon exists
    let menuIcon = document.querySelector(".menu-icon");
    if (!menuIcon) {
        const navContainer = document.querySelector(".glass-nav") || document.querySelector(".topbar");
        if (navContainer) {
            const icon = document.createElement("i");
            icon.className = "fas fa-bars menu-icon";
            icon.setAttribute("onclick", "toggleSidebar()");

            const h2 = navContainer.querySelector("h2");
            if (h2 && !navContainer.querySelector(".nav-left")) {
                const navLeft = document.createElement("div");
                navLeft.className = "nav-left";
                h2.parentNode.insertBefore(navLeft, h2);
                navLeft.appendChild(icon);
                navLeft.appendChild(h2);
            } else {
                const navLeft = navContainer.querySelector(".nav-left");
                if (navLeft) {
                    navLeft.insertBefore(icon, navLeft.firstChild);
                } else {
                    navContainer.insertBefore(icon, navContainer.firstChild);
                }
            }
        }
    }

    // 7. Ensure Orbit Background exists
    let orbitBg = document.querySelector(".background-orbit");
    if (!orbitBg) {
        orbitBg = document.createElement("div");
        orbitBg.className = "background-orbit";
        orbitBg.innerHTML = `
            <div class="orbit orbit-big"><div class="dot"></div></div>
            <div class="orbit orbit-mid"><div class="dot"></div></div>
            <div class="orbit orbit-small"><div class="dot"></div></div>
        `;
        document.body.insertBefore(orbitBg, document.body.firstChild);
    }

    // 8. Remove the profile icon (only keep hamburger lines for sidebar)
    document.querySelectorAll(".profile-icon").forEach(icon => icon.remove());
}

// Execute immediately if DOM is ready, or wait
if (document.readyState === "interactive" || document.readyState === "complete") {
    initLayout();
} else {
    document.addEventListener("DOMContentLoaded", initLayout);
}