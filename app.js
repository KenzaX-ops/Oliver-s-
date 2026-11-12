
const SUPABASE_URL = "https://kbivbsotvzegnnypplwg.supabase.co";
const SUPABASE_KEY = "sb_publishable_9zFdRAIvKVs4bMoi-wjXRw_LUQxcxWZ";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

let currentUser = null;
let currentProfile = null;
let requests = [];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(message, isError = true) {
  const box = document.getElementById("message");
  if (box) {
    box.textContent = message;
    box.style.color = isError ? "#dc525c" : "#159b72";
  } else {
    alert(message);
  }
}

function showLogin() {
  app.innerHTML = `
    <div class="auth-card">
      <h1>🚘 OfficeRide</h1>
      <p class="subtitle">Office Vehicle Management System</p>

      <div class="field">
        <label>Email Address</label>
        <input id="email" type="email" placeholder="Enter your email">
      </div>

      <div class="field">
        <label>Password</label>
        <input id="password" type="password" placeholder="Enter password">
      </div>

      <button class="primary-btn" style="width:100%;margin-top:22px"
        onclick="login()">Login</button>

      <button onclick="showSignup()"
        style="background:none;color:#3563e9;margin-top:18px">
        Create a new account
      </button>

      <p id="message" class="message"></p>
    </div>
  `;
}

function showSignup() {
  app.innerHTML = `
    <div class="auth-card">
      <h1>Create Account</h1>
      <p class="subtitle">Register as an office staff member</p>

      <div class="field">
        <label>Full Name</label>
        <input id="fullname" placeholder="Your full name">
      </div>

      <div class="field">
        <label>Department</label>
        <input id="department" placeholder="Your department">
      </div>

      <div class="field">
        <label>Email Address</label>
        <input id="email" type="email" placeholder="Your email">
      </div>

      <div class="field">
        <label>Password</label>
        <input id="password" type="password" placeholder="At least 6 characters">
      </div>

      <button class="primary-btn" style="width:100%;margin-top:22px"
        onclick="signup()">Create Account</button>

      <button onclick="showLogin()"
        style="background:none;color:#3563e9;margin-top:18px">
        Back to Login
      </button>

      <p id="message" class="message"></p>
    </div>
  `;
}

async function signup() {
  const full_name = document.getElementById("fullname").value.trim();
  const department = document.getElementById("department").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!full_name || !department || !email || password.length < 6) {
    showMessage("Please complete all fields. Password needs 6 characters.");
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, department }
    }
  });

  if (error) return showMessage(error.message);

  showMessage(
    "Account created! You can log in after email confirmation if required.",
    false
  );
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) return showMessage(error.message);

  await loadApp();
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showLogin();
}

async function loadApp() {
  const { data: sessionData } = await db.auth.getSession();
  currentUser = sessionData.session?.user;

  if (!currentUser) {
    showLogin();
    return;
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !profile) {
    app.innerHTML = `
      <div class="auth-card">
        <h2>Profile not found</h2>
        <p class="message">${escapeHTML(error?.message || "Please contact admin.")}</p>
        <button class="primary-btn" onclick="logout()">Logout</button>
      </div>`;
    return;
  }

  currentProfile = profile;
  await loadDashboard();
}

async function loadDashboard() {
  const isAdmin = currentProfile.role === "admin";

  const { data, error } = await db
    .from("vehicle_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    app.innerHTML = `<div class="auth-card">
      <h2>Unable to load requests</h2>
      <p class="message">${escapeHTML(error.message)}</p>
      <button class="primary-btn" onclick="logout()">Logout</button>
    </div>`;
    return;
  }

  requests = data || [];

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">Office<span>Ride.</span></div>
        <p class="nav-label">MAIN MENU</p>

        <button class="nav-item active" onclick="loadDashboard()">
          ▦ Dashboard
        </button>

        <button class="nav-item" onclick="showRequestForm()">
          ＋ New Request
        </button>

        <button class="nav-item" onclick="showHistory()">
          ◷ Request History
        </button>

        ${isAdmin ? `
          <p class="nav-label">ADMIN</p>
          <button class="nav-item" onclick="showAdminRequests()">
            ✓ Manage Requests
          </button>` : ""}

        <p class="nav-label">ACCOUNT</p>
        <button class="nav-item" onclick="logout()">↪ Logout</button>
      </aside>

      <main class="main">
        <div class="topbar">
          <div>
            <h1>Dashboard</h1>
            <p class="subtitle">
              Welcome, ${escapeHTML(currentProfile.full_name || currentUser.email)}
              · ${isAdmin ? "Administrator" : "Staff"}
            </p>
          </div>
          <button class="primary-btn" onclick="showRequestForm()">
            + New Request
          </button>
        </div>

        <section class="stats">
          <div class="stat-card">
            <p>Total Requests</p>
            <h2>${requests.length}</h2>
            <small>All visible requests</small>
          </div>
          <div class="stat-card">
            <p>Pending</p>
            <h2>${requests.filter(r => r.status === "pending").length}</h2>
            <small>Awaiting approval</small>
          </div>
          <div class="stat-card">
            <p>Approved</p>
            <h2>${requests.filter(r => r.status === "approved").length}</h2>
            <small>Approved bookings</small>
          </div>
          <div class="stat-card">
            <p>Rejected</p>
            <h2>${requests.filter(r => r.status === "rejected").length}</h2>
            <small>Rejected requests</small>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>Recent Vehicle Requests</h2>
            <button onclick="showHistory()" style="color:#3563e9;background:none">
              View All →
            </button>
          </div>
          <div id="requestTable"></div>
        </section>
      </main>
    </div>
  `;

  renderTable(requests.slice(0, 5), "requestTable");
}

function renderTable(rows, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!rows.length) {
    target.innerHTML = `<p class="subtitle">No requests found.</p>`;
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Requester</th>
            <th>Destination</th>
            <th>Department</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${escapeHTML(r.request_date)}</td>
              <td>${escapeHTML(r.requester_name)}</td>
              <td>${escapeHTML(r.destination)}</td>
              <td>${escapeHTML(r.department)}</td>
              <td><span class="status ${escapeHTML(r.status)}">
                ${escapeHTML(r.status)}
              </span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function showRequestForm() {
  app.innerHTML = `
    <div class="main">
      <div class="topbar">
        <div>
          <h1>New Vehicle Request</h1>
          <p class="subtitle">Complete the form to request the office vehicle.</p>
        </div>
        <button class="primary-btn" onclick="loadDashboard()">← Dashboard</button>
      </div>

      <section class="panel">
        <form id="requestForm">
          <div class="form-grid">
            <div class="field">
              <label>Request Date</label>
              <input type="date" name="request_date" required>
            </div>
            <div class="field">
              <label>Requester Name</label>
              <input name="requester_name"
                value="${escapeHTML(currentProfile.full_name)}" required>
            </div>
            <div class="field">
              <label>Department</label>
              <input name="department"
                value="${escapeHTML(currentProfile.department)}" required>
            </div>
            <div class="field">
              <label>Destination</label>
              <input name="destination" required>
            </div>
            <div class="field full">
              <label>Purpose of Travel</label>
              <textarea name="purpose" rows="3" required></textarea>
            </div>
            <div class="field">
              <label>Departure Time</label>
              <input type="time" name="departure_time" required>
            </div>
            <div class="field">
              <label>Return Time</label>
              <input type="time" name="return_time" required>
            </div>
            <div class="field">
              <label>Number of Passengers</label>
              <input type="number" name="passenger_count"
                min="1" max="20" value="1" required>
            </div>
          </div>

          <p id="message" class="message"></p>
          <button class="primary-btn" type="submit" style="margin-top:22px">
            Submit Request
          </button>
        </form>
      </section>
    </div>
  `;

  document.getElementById("requestForm").addEventListener("submit", submitRequest);
}

async function submitRequest(event) {
  event.preventDefault();

  const form = new FormData(event.target);
  const request = Object.fromEntries(form.entries());

  if (request.return_time <= request.departure_time) {
    return showMessage("Return time must be later than departure time.");
  }

  request.passenger_count = Number(request.passenger_count);
  request.status = "pending";
  request.user_id = currentUser.id;

  const { error } = await db
    .from("vehicle_requests")
    .insert(request);

  if (error) {
    return showMessage(
      error.message.includes("exclusion") || error.code === "23P01"
        ? "This vehicle is already booked for an overlapping time."
        : error.message
    );
  }

  alert("Your request has been submitted!");
  await loadDashboard();
}

function showHistory() {
  app.innerHTML = `
    <div class="main">
      <div class="topbar">
        <div>
          <h1>Request History</h1>
          <p class="subtitle">Search vehicle requests by date.</p>
        </div>
        <button class="primary-btn" onclick="loadDashboard()">← Dashboard</button>
      </div>

      <section class="panel">
        <div class="field">
          <label>Search by Request Date</label>
          <input type="date" id="searchDate" onchange="filterHistory()">
        </div>
        <button onclick="clearHistoryFilter()"
          style="margin-top:12px;color:#3563e9;background:none">
          Clear Filter
        </button>
        <div id="historyTable" style="margin-top:20px"></div>
      </section>
    </div>
  `;

  renderTable(requests, "historyTable");
}

function filterHistory() {
  const date = document.getElementById("searchDate").value;
  const filtered = date
    ? requests.filter(r => r.request_date === date)
    : requests;

  renderTable(filtered, "historyTable");
}

function clearHistoryFilter() {
  document.getElementById("searchDate").value = "";
  renderTable(requests, "historyTable");
}

function showAdminRequests() {
  if (currentProfile.role !== "admin") return;

  app.innerHTML = `
    <div class="main">
      <div class="topbar">
        <div>
          <h1>Manage Requests</h1>
          <p class="subtitle">Review and approve staff vehicle requests.</p>
        </div>
        <button class="primary-btn" onclick="loadDashboard()">← Dashboard</button>
      </div>

      <section class="panel">
        <div id="adminTable"></div>
      </section>
    </div>
  `;

  const target = document.getElementById("adminTable");

  if (!requests.length) {
    target.innerHTML = `<p class="subtitle">No requests available.</p>`;
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Requester</th>
            <th>Destination</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map(r => `
            <tr>
              <td>${escapeHTML(r.request_date)}</td>
              <td>${escapeHTML(r.requester_name)}</td>
              <td>${escapeHTML(r.destination)}</td>
              <td>${escapeHTML(r.departure_time)} - ${escapeHTML(r.return_time)}</td>
              <td><span class="status ${escapeHTML(r.status)}">
                ${escapeHTML(r.status)}
              </span></td>
              <td>
                ${r.status === "pending" ? `
                  <button class="primary-btn"
                    onclick="updateStatus('${r.id}','approved')">
                    Approve
                  </button>
                  <button onclick="updateStatus('${r.id}','rejected')"
                    style="background:#ffebeb;color:#c3434b;padding:10px;border-radius:8px;margin-top:5px">
                    Reject
                  </button>
                ` : "—"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function updateStatus(id, status) {
  if (currentProfile.role !== "admin") return;

  const confirmed = confirm(`Are you sure you want to ${status} this request?`);
  if (!confirmed) return;

  const { error } = await db
    .from("vehicle_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert(`Request ${status}!`);
  await loadDashboard();
  showAdminRequests();
}

db.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    currentUser = null;
    currentProfile = null;
    showLogin();
  }
});

loadApp();
    
