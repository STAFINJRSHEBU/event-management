/* ============================================================
   EDUEVENTS — COMPLETE FRONTEND APPLICATION JS
   ============================================================ */

const API = '';
let currentUser = null;
let allEvents = [];
let currentEventId = null;
let adminCharts = {};

/* ============================================================
   INIT
   ============================================================ */
$(document).ready(function () {
  initParticles();
  loadStoredAuth();
  showPage('home');
  loadHeroStats();
  loadNotifications();
  initNavbarScroll();
  initCountdownTimers();
});

/* ============================================================
   PARTICLES (HERO)
   ============================================================ */
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const colors = ['#6366f1', '#8b5cf6', '#38bdf8', '#22c55e'];
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 12 + 8}s;
      animation-delay:${Math.random() * 8}s;
      opacity:${Math.random() * 0.5 + 0.1};
    `;
    container.appendChild(p);
  }
}

/* ============================================================
   NAVBAR SCROLL
   ============================================================ */
function initNavbarScroll() {
  $(window).on('scroll', function () {
    if ($(this).scrollTop() > 30) $('#mainNav').addClass('scrolled');
    else $('#mainNav').removeClass('scrolled');
  });
}

/* ============================================================
   AUTH — STORAGE & INIT
   ============================================================ */
function loadStoredAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    currentUser = JSON.parse(user);
    updateNavForUser();
  }
}

function updateNavForUser() {
  if (currentUser) {
    $('#loginNavItem').addClass('d-none');
    $('#userNavItem').removeClass('d-none');
    $('#myRegistrationsNav').removeClass('d-none');
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    $('#navAvatar').text(initials);
    $('#navUserName').text(currentUser.name.split(' ')[0]);
    if (currentUser.role === 'admin') $('#adminNavItem').removeClass('d-none');
  } else {
    $('#loginNavItem').removeClass('d-none');
    $('#userNavItem').addClass('d-none');
    $('#myRegistrationsNav').addClass('d-none');
    $('#adminNavItem').addClass('d-none');
  }
}

function getToken() { return localStorage.getItem('token'); }

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

/* ============================================================
   PAGE ROUTING
   ============================================================ */
function showPage(page) {
  $('.page').removeClass('active').hide();
  const $page = $(`#page-${page}`);
  if ($page.length) { $page.addClass('active').show(); }

  // Close mobile sidebar if open
  $('#adminSidebar').removeClass('open');

  // Page-specific initializers
  if (page === 'home') { loadHeroStats(); loadNotifications(); }
  if (page === 'events') loadEvents();
  if (page === 'notifications') loadNotifications();
  if (page === 'myRegistrations') { if (!currentUser) { showPage('login'); return; } loadMyRegistrations(); }
  if (page === 'profile') { if (!currentUser) { showPage('login'); return; } loadProfile(); }
  if (page === 'admin') {
    if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'danger'); showPage('home'); return; }
    switchAdminTab('dashboard');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   HERO STATS
   ============================================================ */
async function loadHeroStats() {
  try {
    const res = await fetch(`${API}/api/events`);
    const events = await res.json();
    animateNumber('statEvents', events.length);

    const nRes = await fetch(`${API}/api/registrations/my`, { headers: authHeaders() });
    if (nRes.ok) {
      const myRegs = await nRes.json();
      animateNumber('statRegs', myRegs.length);
    }

    if (currentUser?.role === 'admin') {
      const sRes = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
      if (sRes.ok) {
        const stats = await sRes.json();
        animateNumber('statUsers', stats.totalUsers);
        animateNumber('statRegs', stats.totalRegistrations);
      }
    }
  } catch (e) { console.log('Stats load error:', e); }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ============================================================
   EVENTS — LOAD & RENDER
   ============================================================ */
async function loadEvents() {
  $('#eventsGrid').html(`<div class="col-12 text-center py-5"><div class="spinner-glow mx-auto"></div><p class="text-muted mt-3">Loading events...</p></div>`);
  try {
    const res = await fetch(`${API}/api/events`);
    allEvents = await res.json();
    renderEvents(allEvents);
  } catch (e) {
    $('#eventsGrid').html(`<div class="col-12 empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load events. Make sure the server is running.</p></div>`);
  }
}

function renderEvents(events) {
  if (!events.length) {
    $('#eventsGrid').html(`<div class="col-12 empty-state"><i class="fas fa-calendar-times"></i><p>No events found matching your criteria.</p></div>`);
    return;
  }

  const categoryEmojis = { music: '🎵', dance: '💃', sports: '⚽', academic: '📚', arts: '🎨', technology: '💻', culture: '🎭', other: '🌟' };

  const html = events.map(event => {
    const date = new Date(event.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const pct = Math.round((event.registeredCount / event.capacity) * 100);
    const fillColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
    const isFull = event.registeredCount >= event.capacity;
    const isOpen = event.status === 'open';
    const emoji = categoryEmojis[event.category] || '🌟';
    const daysLeft = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));

    return `
    <div class="col-sm-6 col-xl-4">
      <div class="event-card h-100" onclick="openEventDetail('${event._id}')">
        <div class="event-card-img" style="background: url('${event.image || `https://picsum.photos/seed/${event._id}/400/200`}'); background-size: cover; background-position: center;">
          <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.6), transparent);"></div>
          <div style="position:absolute;top:12px;left:12px" class="badge-glass badge-glass-cyan shadow-sm">${emoji} ${event.category}</div>
          <div style="position:absolute;top:12px;right:12px">
            <span class="status-badge status-${event.status}">${event.status.charAt(0).toUpperCase() + event.status.slice(1)}</span>
          </div>
          ${daysLeft > 0 && daysLeft <= 7 ? `<div style="position:absolute;bottom:10px;left:12px;font-size:0.75rem;background:rgba(0,0,0,0.8);padding:4px 12px;border-radius:50px;color:#f59e0b;font-weight:600"><i class="fas fa-clock me-1"></i>${daysLeft} d left</div>` : ''}
        </div>
        <div class="event-card-body pt-3">
          <div class="badge-glass badge-glass-cyan mb-2" style="font-size:0.7rem">${emoji} ${event.category}</div>
          <h5 class="event-card-title">${event.name}</h5>
          <div class="event-card-meta">
            <span><i class="fas fa-calendar-alt"></i>${dateStr}</span>
            <span><i class="fas fa-clock"></i>${event.time}</span>
            <span><i class="fas fa-map-marker-alt"></i>${event.venue || 'TBA'}</span>
          </div>
          <div class="event-capacity-bar mt-2">
            <div class="event-capacity-fill" style="width:${pct}%; background:${fillColor}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted);margin-top:4px">
            <span>${event.registeredCount}/${event.capacity} registered</span>
            <span>${pct}% full</span>
          </div>
        </div>
        <div class="event-card-footer">
          <span style="font-size:0.78rem;color:var(--text-muted)">${event.description.slice(0, 50)}...</span>
          <button class="btn btn-primary btn-sm ms-2" style="white-space:nowrap;font-size:0.75rem;padding:6px 14px"
            onclick="event.stopPropagation(); ${isOpen && !isFull ? `openEventDetail('${event._id}')` : ''}">
            ${isFull ? '🔒 Full' : !isOpen ? '🔒 Closed' : 'Register →'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  $('#eventsGrid').html(html);
}

function filterEvents() {
  const search = $('#eventSearch').val().toLowerCase();
  const category = $('#categoryFilter').val();
  const status = $('#statusFilter').val();
  const filtered = allEvents.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search) || e.description.toLowerCase().includes(search);
    const matchCat = !category || e.category === category;
    const matchStatus = !status || e.status === status;
    return matchSearch && matchCat && matchStatus;
  });
  renderEvents(filtered);
}

function heroSearch() {
  const val = $('#heroSearch').val().trim();
  if (val) { $('#eventSearch').val(val); showPage('events'); filterEvents(); }
  else showPage('events');
}

/* ============================================================
   EVENT DETAIL MODAL
   ============================================================ */
async function openEventDetail(eventId) {
  currentEventId = eventId;
  try {
    const res = await fetch(`${API}/api/events/${eventId}`);
    const event = await res.json();
    const date = new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const pct = Math.round((event.registeredCount / event.capacity) * 100);
    const seatsLeft = event.capacity - event.registeredCount;
    const isFull = seatsLeft <= 0;
    const isOpen = event.status === 'open';
    const categoryEmojis = { music: '🎵', dance: '💃', sports: '⚽', academic: '📚', arts: '🎨', technology: '💻', culture: '🎭', other: '🌟' };

    $('#modalEventName').text(event.name);
    $('#modalEventBody').html(`
      <div class="event-card-img mb-3" style="height:180px;border-radius:12px;background: url('${event.image || `https://picsum.photos/seed/${event._id}/800/400`}'); background-size: cover; background-position: center;">
      </div>
      <p class="text-secondary mb-4">${event.description}</p>
      <div class="row g-3 mb-4">
        <div class="col-6"><div class="glass-card p-3 text-center"><i class="fas fa-calendar-alt text-primary mb-2 d-block"></i><div style="font-size:0.8rem;color:var(--text-muted)">Date</div><div style="font-size:0.85rem;font-weight:600">${date}</div></div></div>
        <div class="col-6"><div class="glass-card p-3 text-center"><i class="fas fa-clock text-primary mb-2 d-block"></i><div style="font-size:0.8rem;color:var(--text-muted)">Time</div><div style="font-size:0.85rem;font-weight:600">${event.time}</div></div></div>
        <div class="col-6"><div class="glass-card p-3 text-center"><i class="fas fa-map-marker-alt text-primary mb-2 d-block"></i><div style="font-size:0.8rem;color:var(--text-muted)">Venue</div><div style="font-size:0.85rem;font-weight:600">${event.venue || 'TBA'}</div></div></div>
        <div class="col-6"><div class="glass-card p-3 text-center"><i class="fas fa-users text-primary mb-2 d-block"></i><div style="font-size:0.8rem;color:var(--text-muted)">Seats Left</div><div style="font-size:0.85rem;font-weight:600;color:${seatsLeft <= 10 ? '#ef4444' : '#22c55e'}">${seatsLeft}</div></div></div>
      </div>
      <div>
        <div class="d-flex justify-content-between mb-1" style="font-size:0.8rem;color:var(--text-muted)"><span>Registration Progress</span><span>${pct}% Filled</span></div>
        <div class="event-capacity-bar" style="height:8px;border-radius:4px">
          <div class="event-capacity-fill" style="width:${pct}%;background:${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'}"></div>
        </div>
      </div>
      ${isFull ? '<div class="alert alert-danger mt-3 py-2"><i class="fas fa-ban me-2"></i>This event is fully booked.</div>' : ''}
      ${!isOpen ? '<div class="alert alert-danger mt-3 py-2"><i class="fas fa-lock me-2"></i>Registration is closed for this event.</div>' : ''}
    `);

    const canRegister = isOpen && !isFull && currentUser && currentUser.role !== 'admin';
    $('#modalRegisterBtn').toggle(canRegister);
    if (!currentUser) {
      $('#modalRegisterBtn').show().text('Sign in to Register').off('click').on('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('eventDetailModal'))?.hide();
        showPage('login');
      });
    }

    new bootstrap.Modal(document.getElementById('eventDetailModal')).show();
  } catch (e) { showToast('Failed to load event details', 'danger'); }
}

async function registerForEvent() {
  if (!currentUser) { showPage('login'); return; }

  $('#regFormError').addClass('d-none');
  $('#regClassInfo, #regSchoolInfo, #regPhoneInfo').val('');

  if (currentUser.participantType === 'External') {
    $('#classInputGroup').hide();
    $('#schoolInputGroup').show();
  } else {
    $('#classInputGroup').show();
    $('#schoolInputGroup').hide();
  }
  new bootstrap.Modal(document.getElementById('registrationFormModal')).show();
}

async function submitRegistration() {
  const className = $('#regClassInfo').val().trim();
  const schoolName = $('#regSchoolInfo').val().trim();
  const phone = $('#regPhoneInfo').val().trim();

  if (currentUser.participantType === 'External' && (!schoolName || !phone)) {
    $('#regFormError').removeClass('d-none').text('Please fill in your institution and contact number.');
    return;
  }
  if (currentUser.participantType === 'Internal' && (!className || !phone)) {
    $('#regFormError').removeClass('d-none').text('Please fill in your class and contact number.');
    return;
  }

  const btn = $('#confirmRegBtn');
  btn.prop('disabled', true).html('<div class="spinner-border spinner-border-sm me-2"></div>Registering...');

  try {
    const res = await fetch(`${API}/api/events/${currentEventId}/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ className, schoolName, phone })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('🎉 Successfully registered! Check My Tickets.', 'success');
      bootstrap.Modal.getInstance(document.getElementById('registrationFormModal'))?.hide();
      bootstrap.Modal.getInstance(document.getElementById('eventDetailModal'))?.hide();
      loadEvents();
    } else {
      $('#regFormError').removeClass('d-none').text(data.message || 'Registration failed');
    }
  } catch (e) {
    $('#regFormError').removeClass('d-none').text('Network error. Try again.');
  }
  btn.prop('disabled', false).html('<i class="fas fa-check me-2"></i>Confirm Register');
}

/* ============================================================
   AI RECOMMENDATIONS
   ============================================================ */
function openAIRecommend() {
  $('#aiRecommendSection').toggleClass('d-none');
}

async function getAIRecommendations() {
  const keywords = $('#aiKeywords').val().trim();
  if (!keywords) { showToast('Enter some interests first!', 'danger'); return; }
  $('#aiRecommendResults').html('<div class="text-center py-3"><div class="spinner-glow mx-auto"></div><p class="text-muted mt-2 small">Analyzing your interests...</p></div>');

  try {
    const res = await fetch(`${API}/api/events/ai/recommend?keywords=${encodeURIComponent(keywords)}`);
    const events = await res.json();
    if (!events.length) {
      $('#aiRecommendResults').html('<p class="text-muted small text-center py-2">No matching events found. Try different keywords.</p>');
      return;
    }
    const html = `
      <h6 class="text-primary mb-3"><i class="fas fa-magic me-2"></i>AI Found ${events.length} Event(s) For You</h6>
      <div class="row g-2">
        ${events.map(e => `
          <div class="col-md-6">
            <div class="insight-card" style="cursor:pointer" onclick="openEventDetail('${e._id}')">
              <span class="insight-icon">🎯</span>
              <div>
                <div style="font-weight:600;font-size:0.875rem">${e.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${e.category} · ${new Date(e.date).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
    $('#aiRecommendResults').html(html);
  } catch (e) {
    $('#aiRecommendResults').html('<p class="text-muted small text-center">AI service unavailable.</p>');
  }
}

/* ============================================================
   VOICE INPUT
   ============================================================ */
function startVoiceInput(targetId) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser', 'danger'); return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const btn = $(`[onclick="startVoiceInput('${targetId}')"]`);
  btn.addClass('recording');
  showToast('🎙️ Listening... Speak now!', 'info');

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    $(`#${targetId}`).val(transcript);
    btn.removeClass('recording');
    showToast('✅ Voice captured: "' + transcript + '"', 'success');
  };
  recognition.onerror = () => { btn.removeClass('recording'); showToast('Voice capture failed', 'danger'); };
  recognition.onend = () => btn.removeClass('recording');
  recognition.start();
}

/* ============================================================
   AUTH — LOGIN / SIGNUP
   ============================================================ */
function switchAuthTab(tab) {
  if (tab === 'login') {
    $('#loginForm').show(); $('#signupForm').addClass('d-none');
    $('#loginTabBtn').addClass('active'); $('#signupTabBtn').removeClass('active');
  } else {
    $('#signupForm').removeClass('d-none'); $('#loginForm').hide();
    $('#signupTabBtn').addClass('active'); $('#loginTabBtn').removeClass('active');
  }
  $('#loginError, #signupError').addClass('d-none');
}

function togglePassword(inputId) {
  const input = $(`#${inputId}`);
  const isPass = input.attr('type') === 'password';
  input.attr('type', isPass ? 'text' : 'password');
  input.closest('.input-icon-wrap').find('.btn-eye i').toggleClass('fa-eye fa-eye-slash');
}

async function handleLogin() {
  const email = $('#loginEmail').val().trim();
  const password = $('#loginPassword').val().trim();
  if (!email || !password) { showAuthError('loginError', 'Please fill all fields'); return; }

  setButtonLoading('loginBtn', true);
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      updateNavForUser();
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
      setTimeout(() => showPage(data.user.role === 'admin' ? 'admin' : 'events'), 400);
    } else {
      showAuthError('loginError', data.message || 'Login failed');
    }
  } catch (e) { showAuthError('loginError', 'Network error. Is the server running?'); }
  setButtonLoading('loginBtn', false);
}

async function handleSignup() {
  const name = $('#signupName').val().trim();
  const email = $('#signupEmail').val().trim();
  const password = $('#signupPassword').val().trim();
  const participantType = $('#signupType').val();
  if (!name || !email || !password) { showAuthError('signupError', 'Please fill all fields'); return; }
  if (password.length < 6) { showAuthError('signupError', 'Password must be at least 6 characters'); return; }

  setButtonLoading('signupBtn', true);
  try {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, participantType })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      updateNavForUser();
      showToast(`Account created! Welcome, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
      setTimeout(() => showPage('events'), 400);
    } else {
      showAuthError('signupError', data.message || 'Signup failed');
    }
  } catch (e) { showAuthError('signupError', 'Network error. Is the server running?'); }
  setButtonLoading('signupBtn', false);
}

function showAuthError(id, msg) {
  $(`#${id}`).removeClass('d-none').text(msg);
}

function setButtonLoading(id, loading) {
  const btn = $(`#${id}`);
  btn.find('.btn-text').toggle(!loading);
  btn.find('.btn-loader').toggleClass('d-none', !loading);
  btn.prop('disabled', loading);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateNavForUser();
  showToast('Logged out successfully', 'info');
  showPage('home');
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
async function loadNotifications() {
  try {
    const res = await fetch(`${API}/api/notifications`);
    const notifications = await res.json();

    const typeIcon = { info: '💡', success: '✅', warning: '⚠️', alert: '🚨' };
    const html = notifications.length ? notifications.map(n => `
      <div class="col-12">
        <div class="notif-card notif-${n.type}">
          <div class="d-flex align-items-start gap-3">
            <span style="font-size:1.3rem;flex-shrink:0">${typeIcon[n.type] || '📢'}</span>
            <div class="flex-grow-1">
              <p class="mb-1" style="color:var(--text-primary);font-size:0.9rem">${n.message}</p>
              <small class="text-muted">${new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          </div>
        </div>
      </div>
    `).join('') : `<div class="col-12 empty-state"><i class="fas fa-bell-slash"></i><p>No notifications yet.</p></div>`;

    $('#notificationsContainer').html(html);
  } catch (e) { console.log('Notifications error:', e); }
}

/* ============================================================
   MY REGISTRATIONS
   ============================================================ */
async function loadMyRegistrations() {
  $('#myRegistrationsContainer').html(`<div class="col-12 text-center py-5"><div class="spinner-glow mx-auto"></div><p class="text-muted mt-3">Loading your registrations...</p></div>`);
  try {
    const res = await fetch(`${API}/api/registrations/my`, { headers: authHeaders() });
    const regs = await res.json();
    if (!regs.length) {
      $('#myRegistrationsContainer').html(`<div class="col-12 empty-state"><i class="fas fa-ticket"></i><p>No registrations yet. Browse events and sign up!</p><button class="btn btn-primary mt-3" onclick="showPage('events')">Browse Events</button></div>`);
      return;
    }
    const html = regs.map(r => {
      const event = r.event;
      if (!event) return '';
      const date = new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const categoryEmojis = { music: '🎵', dance: '💃', sports: '⚽', academic: '📚', arts: '🎨', technology: '💻', culture: '🎭', other: '🌟' };
      return `
        <div class="col-md-6 col-xl-4">
          <div class="ticket-card">
            <div class="ticket-header">
              <div class="d-flex align-items-center gap-3">
                <span style="font-size:2rem">${categoryEmojis[event.category] || '🌟'}</span>
                <div>
                  <h5 style="font-size:1rem;margin:0;font-weight:700">${event.name}</h5>
                  <span class="status-badge status-${event.status}">${event.status}</span>
                </div>
              </div>
            </div>
            <div class="ticket-body">
              <div class="row g-2" style="font-size:0.82rem;color:var(--text-muted)">
                <div class="col-6"><i class="fas fa-calendar me-2 text-primary"></i>${date}</div>
                <div class="col-6"><i class="fas fa-clock me-2 text-primary"></i>${event.time}</div>
                <div class="col-6"><i class="fas fa-map-marker-alt me-2 text-primary"></i>${event.venue || 'TBA'}</div>
                <div class="col-6"><i class="fas fa-id-badge me-2 text-primary"></i>${r.participantType}</div>
              </div>
              <div class="mt-3 pt-3" style="border-top:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:0.72rem;color:var(--text-muted)">Registered ${new Date(r.registeredAt).toLocaleDateString()}</span>
                <span class="badge-glass badge-glass-green">✓ Confirmed</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
    $('#myRegistrationsContainer').html(html);
  } catch (e) { $('#myRegistrationsContainer').html(`<div class="col-12 empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load registrations.</p></div>`); }
}

/* ============================================================
   PROFILE
   ============================================================ */
async function loadProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  $('#profileAvatar').text(initials);
  $('#profileName').text(currentUser.name);
  $('#profileEmail').text(currentUser.email);
  $('#profileRole').text(currentUser.role === 'admin' ? '👑 Admin' : '🎓 Student');
  $('#profileType').text(currentUser.participantType || 'Internal');
  $('#profileMember').text(new Date().getFullYear());

  try {
    const res = await fetch(`${API}/api/registrations/my`, { headers: authHeaders() });
    if (res.ok) { const regs = await res.json(); $('#profileRegCount').text(regs.length); }
  } catch (e) { }
}

/* ============================================================
   ADMIN — TAB SWITCHING
   ============================================================ */
function switchAdminTab(tab) {
  $('.admin-tab').removeClass('active');
  $(`#adminTab-${tab}`).addClass('active');
  $('.sidebar-link').removeClass('active');
  $(`#tab-${tab}`).addClass('active');

  // Sidebar user info
  if (currentUser) {
    $('#sidebarUser').html(`
      <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${currentUser.name}</div>
      <div style="font-size:0.72rem;margin-top:2px">👑 Administrator</div>
    `);
  }

  if (tab === 'dashboard') loadAdminDashboard();
  if (tab === 'manageEvents') loadAdminEvents();
  if (tab === 'participants') loadAdminRegistrations();
  if (tab === 'adminNotifications') loadAdminNotifications();
  if (tab === 'aiInsights') loadAIInsights();
}

function toggleSidebar() {
  $('#adminSidebar').toggleClass('open');
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
    const stats = await res.json();

    animateNumber('dashTotalUsers', stats.totalUsers);
    animateNumber('dashTotalEvents', stats.totalEvents);
    animateNumber('dashTotalRegs', stats.totalRegistrations);
    $('#dashPopularEvent').text(stats.mostPopularEvent?.name || 'N/A');

    // Quick stats
    $('#quickStatsList').html(`
      <div class="quick-stat-item"><span class="quick-stat-label"><i class="fas fa-user-graduate me-2 text-primary"></i>Internal Participants</span><span class="quick-stat-val">${stats.internalCount}</span></div>
      <div class="quick-stat-item"><span class="quick-stat-label"><i class="fas fa-user-tie me-2 text-accent"></i>External Participants</span><span class="quick-stat-val">${stats.externalCount}</span></div>
      <div class="quick-stat-item"><span class="quick-stat-label"><i class="fas fa-fire me-2 text-orange"></i>Trending Event</span><span class="quick-stat-val" style="font-size:0.8rem">${stats.mostPopularEvent?.name || '—'}</span></div>
      <div class="quick-stat-item"><span class="quick-stat-label"><i class="fas fa-chart-bar me-2 text-success"></i>Fill Rate</span><span class="quick-stat-val">${stats.totalEvents ? Math.round((stats.totalRegistrations / (stats.totalEvents * 100)) * 100) : 0}%</span></div>
    `);

    renderCharts(stats);
  } catch (e) { console.log('Dashboard error:', e); }
}

function renderCharts(stats) {
  // Destroy old charts
  Object.values(adminCharts).forEach(c => c?.destroy());
  adminCharts = {};

  const chartDefaults = {
    color: '#94a3b8',
    borderColor: 'rgba(148,163,184,0.1)',
    grid: { color: 'rgba(148,163,184,0.08)', borderColor: 'transparent' }
  };

  // Line chart - registrations
  const days = stats.dailyRegistrations || [];
  adminCharts.line = new Chart(document.getElementById('registrationsChart'), {
    type: 'line',
    data: {
      labels: days.length ? days.map(d => d._id) : ['No data'],
      datasets: [{
        label: 'Registrations',
        data: days.length ? days.map(d => d.count) : [0],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f8fafc' } } },
      scales: {
        x: { ticks: { color: '#f8fafc' }, grid: chartDefaults.grid },
        y: { ticks: { color: '#f8fafc' }, grid: chartDefaults.grid, beginAtZero: true }
      }
    }
  });

  // Pie chart - participant types
  adminCharts.pie = new Chart(document.getElementById('participantPieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Internal', 'External'],
      datasets: [{
        data: [stats.internalCount || 0, stats.externalCount || 0],
        backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(56,189,248,0.8)'],
        borderColor: ['#6366f1', '#38bdf8'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 15 } }
      },
      cutout: '65%'
    }
  });

  // Bar chart - categories
  const cats = stats.categoryBreakdown || [];
  adminCharts.bar = new Chart(document.getElementById('categoryChart'), {
    type: 'bar',
    data: {
      labels: cats.map(c => c._id),
      datasets: [{
        label: 'Events',
        data: cats.map(c => c.count),
        backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(139,92,246,0.7)', 'rgba(56,189,248,0.7)', 'rgba(34,197,94,0.7)', 'rgba(249,115,22,0.7)', 'rgba(236,72,153,0.7)'],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#f8fafc' }, grid: chartDefaults.grid },
        y: { ticks: { color: '#f8fafc', stepSize: 1 }, grid: chartDefaults.grid, beginAtZero: true }
      }
    }
  });
}

/* ============================================================
   ADMIN — MANAGE EVENTS
   ============================================================ */
async function loadAdminEvents() {
  $('#eventsAdminTbody').html(`<tr><td colspan="7" class="text-center py-4"><div class="spinner-glow mx-auto"></div></td></tr>`);
  try {
    const res = await fetch(`${API}/api/events`, { headers: authHeaders() });
    const events = await res.json();
    if (!events.length) {
      $('#eventsAdminTbody').html(`<tr><td colspan="7" class="text-center py-4 text-muted">No events found. Add your first event!</td></tr>`);
      return;
    }
    const html = events.map(e => {
      const date = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const pct = Math.round((e.registeredCount / e.capacity) * 100);
      return `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--text-primary)">${e.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${e.venue || 'TBA'}</div>
          </td>
          <td>${date}<br><span style="font-size:0.75rem;color:var(--text-muted)">${e.time}</span></td>
          <td><span class="badge-glass" style="font-size:0.72rem">${e.category}</span></td>
          <td>${e.capacity}</td>
          <td>
            <span style="color:${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'};font-weight:600">${e.registeredCount}</span>
            <small class="text-muted"> (${pct}%)</small>
          </td>
          <td><span class="status-badge status-${e.status}">${e.status}</span></td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm" style="font-size:0.75rem;padding:5px 12px" onclick="openEditEventModal('${e._id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-outline-danger" onclick="deleteEvent('${e._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
    $('#eventsAdminTbody').html(html);
  } catch (e) { console.log('Admin events error:', e); }
}

function openAddEventModal() {
  $('#editEventId').val('');
  $('#addEventModalTitle').text('Add New Event');
  $('#eventFormName, #eventFormVenue, #eventFormDesc, #eventFormImage').val('');
  $('#eventFormCapacity').val('');
  $('#eventFormDate, #eventFormTime').val('');
  $('#eventFormCategory').val('music');
  $('#eventFormStatus').val('open');
  $('#eventFormError').addClass('d-none');
  new bootstrap.Modal(document.getElementById('addEventModal')).show();
}

async function openEditEventModal(eventId) {
  try {
    const res = await fetch(`${API}/api/events/${eventId}`, { headers: authHeaders() });
    const e = await res.json();
    $('#editEventId').val(e._id);
    $('#addEventModalTitle').text('Edit Event');
    $('#eventFormName').val(e.name);
    $('#eventFormCategory').val(e.category);
    $('#eventFormDate').val(new Date(e.date).toISOString().split('T')[0]);
    $('#eventFormTime').val(e.time);
    $('#eventFormCapacity').val(e.capacity);
    $('#eventFormVenue').val(e.venue);
    $('#eventFormImage').val(e.image || '');
    $('#eventFormStatus').val(e.status);
    $('#eventFormDesc').val(e.description);
    $('#eventFormError').addClass('d-none');
    new bootstrap.Modal(document.getElementById('addEventModal')).show();
  } catch (e) { showToast('Failed to load event', 'danger'); }
}

async function saveEvent() {
  const id = $('#editEventId').val();
  const payload = {
    name: $('#eventFormName').val().trim(),
    category: $('#eventFormCategory').val(),
    date: $('#eventFormDate').val(),
    time: $('#eventFormTime').val(),
    capacity: parseInt($('#eventFormCapacity').val()),
    venue: $('#eventFormVenue').val().trim(),
    image: $('#eventFormImage').val().trim(),
    status: $('#eventFormStatus').val(),
    description: $('#eventFormDesc').val().trim()
  };
  if (!payload.name || !payload.date || !payload.time || !payload.capacity || !payload.description) {
    $('#eventFormError').removeClass('d-none').text('Please fill all required fields.');
    return;
  }
  try {
    const url = id ? `${API}/api/events/${id}` : `${API}/api/events`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('addEventModal'))?.hide();
      showToast(id ? 'Event updated successfully!' : 'Event created successfully!', 'success');
      loadAdminEvents();
    } else {
      $('#eventFormError').removeClass('d-none').text(data.message || 'Save failed');
    }
  } catch (e) { $('#eventFormError').removeClass('d-none').text('Network error'); }
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? All registrations will be removed.')) return;
  try {
    const res = await fetch(`${API}/api/events/${eventId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { showToast('Event deleted', 'success'); loadAdminEvents(); }
    else showToast('Delete failed', 'danger');
  } catch (e) { showToast('Network error', 'danger'); }
}

/* ============================================================
   ADMIN — PARTICIPANTS
   ============================================================ */
async function loadAdminRegistrations() {
  const type = $('#participantTypeFilter').val();
  $('#participantsTbody').html(`<tr><td colspan="6" class="text-center py-4"><div class="spinner-glow mx-auto"></div></td></tr>`);
  try {
    const url = type ? `${API}/api/registrations?participantType=${type}` : `${API}/api/registrations`;
    const res = await fetch(url, { headers: authHeaders() });
    const regs = await res.json();
    if (!regs.length) {
      $('#participantsTbody').html(`<tr><td colspan="6" class="text-center py-4 text-muted">No participants found.</td></tr>`);
      return;
    }
    const html = regs.map(r => {
      const user = r.user || {};
      const event = r.event || {};
      const date = new Date(r.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <tr>
          <td style="color:var(--text-primary);font-weight:500">${user.name || '—'}</td>
          <td>${user.email || '—'}</td>
          <td><span class="badge-glass ${r.participantType === 'Internal' ? '' : 'badge-glass-cyan'}" style="font-size:0.72rem">${r.participantType}</span></td>
          <td style="font-size:0.85rem">${event.name || '—'}</td>
          <td style="font-size:0.82rem;color:var(--text-muted)">${date}</td>
          <td><button class="btn btn-outline-danger" onclick="deleteRegistration('${r._id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    $('#participantsTbody').html(html);
  } catch (e) { console.log('Participants error:', e); }
}

async function deleteRegistration(regId) {
  if (!confirm('Remove this registration?')) return;
  try {
    const res = await fetch(`${API}/api/registrations/${regId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { showToast('Registration removed', 'success'); loadAdminRegistrations(); }
    else showToast('Delete failed', 'danger');
  } catch (e) { showToast('Network error', 'danger'); }
}

/* ============================================================
   ADMIN — NOTIFICATIONS
   ============================================================ */
async function loadAdminNotifications() {
  try {
    const res = await fetch(`${API}/api/notifications`, { headers: authHeaders() });
    const notifs = await res.json();
    const typeIcon = { info: '💡', success: '✅', warning: '⚠️', alert: '🚨' };
    const html = notifs.length ? notifs.map(n => `
      <div class="col-12">
        <div class="notif-card notif-${n.type} d-flex align-items-center justify-content-between gap-3">
          <div class="d-flex align-items-start gap-3 flex-grow-1">
            <span style="font-size:1.3rem">${typeIcon[n.type] || '📢'}</span>
            <div>
              <p class="mb-1" style="color:var(--text-primary);font-size:0.875rem">${n.message}</p>
              <small class="text-muted">${new Date(n.createdAt).toLocaleDateString()}</small>
            </div>
          </div>
          <button class="btn btn-outline-danger flex-shrink-0" onclick="deleteNotification('${n._id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('') : `<div class="col-12 empty-state"><i class="fas fa-bell-slash"></i><p>No notifications sent yet.</p></div>`;
    $('#adminNotifList').html(html);
  } catch (e) { }
}

async function sendNotification() {
  const message = $('#notifMessage').val().trim();
  const type = $('#notifType').val();
  if (!message) { showToast('Enter a message first', 'danger'); return; }
  try {
    const res = await fetch(`${API}/api/notifications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message, type })
    });
    if (res.ok) {
      showToast('Notification sent!', 'success');
      $('#notifMessage').val('');
      loadAdminNotifications();
    }
  } catch (e) { showToast('Failed to send', 'danger'); }
}

async function deleteNotification(id) {
  if (!confirm('Delete this notification?')) return;
  try {
    const res = await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { showToast('Deleted', 'success'); loadAdminNotifications(); }
  } catch (e) { }
}

/* ============================================================
   AI INSIGHTS
   ============================================================ */
async function loadAIInsights() {
  $('#aiInsightsContent').html(`<div class="col-12 text-center py-5"><div class="spinner-glow mx-auto"></div><p class="text-muted mt-3">Analyzing data...</p></div>`);
  try {
    const res = await fetch(`${API}/api/admin/ai-insights`, { headers: authHeaders() });
    const data = await res.json();
    const html = `
      <div class="col-12">
        <div class="glass-card mb-4">
          <h5 class="mb-3"><i class="fas fa-lightbulb me-2 text-warning"></i>AI Generated Insights</h5>
          <div class="row g-3">
            ${(data.insights || []).map(ins => `
              <div class="col-md-6">
                <div class="insight-card">
                  <span class="insight-icon">🧠</span>
                  <p style="font-size:0.875rem;color:var(--text-secondary);margin:0">${ins}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="glass-card">
          <h5 class="mb-3"><i class="fas fa-fire me-2 text-orange"></i>Top Events by Registrations</h5>
          ${(data.topEvents || []).map((e, i) => `
            <div class="quick-stat-item">
              <div class="d-flex align-items-center gap-2">
                <span style="font-size:1.2rem">${['🥇', '🥈', '🥉', '4.', '5.'][i]}</span>
                <span class="quick-stat-label">${e.event?.name || '—'}</span>
              </div>
              <span class="quick-stat-val">${e.registrations} regs</span>
            </div>
          `).join('') || '<p class="text-muted small text-center py-3">No data yet</p>'}
        </div>
      </div>
      <div class="col-lg-6">
        <div class="glass-card">
          <h5 class="mb-3"><i class="fas fa-calendar-check me-2 text-primary"></i>Upcoming Events</h5>
          ${(data.upcomingEvents || []).map(e => `
            <div class="quick-stat-item">
              <span class="quick-stat-label">${e.name}</span>
              <span class="quick-stat-val" style="font-size:0.8rem">${new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          `).join('') || '<p class="text-muted small text-center py-3">No upcoming events</p>'}
        </div>
      </div>
      <div class="col-12">
        <div class="glass-card">
          <h5 class="mb-3"><i class="fas fa-users me-2 text-accent"></i>Participation Pattern</h5>
          <div class="row g-3">
            ${(data.participationTrend || []).map(p => `
              <div class="col-md-4">
                <div class="insight-card justify-content-center text-center flex-column">
                  <div style="font-size:2rem;font-weight:800;color:var(--primary-light)">${p.total}</div>
                  <div style="font-size:0.85rem;color:var(--text-muted)">${p._id} Participants</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
    $('#aiInsightsContent').html(html);
  } catch (e) { $('#aiInsightsContent').html(`<div class="col-12 empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load AI insights.</p></div>`); }
}

/* ============================================================
   CHATBOT
   ============================================================ */
function toggleChatbot() {
  const panel = $('#chatbotPanel');
  const openIcon = $('.chatbot-open-icon');
  const closeIcon = $('.chatbot-close-icon');
  panel.toggleClass('d-none');
  openIcon.toggleClass('d-none');
  closeIcon.toggleClass('d-none');
  $('#chatbotBadge').hide();
  if (!panel.hasClass('d-none')) {
    $('#chatInput').focus();
    $('.chatbot-fab').css('animation', 'none');
  } else {
    $('.chatbot-fab').css('animation', '');
  }
}

function sendChatbotMsg(preset) {
  const input = $('#chatInput');
  const msg = preset || input.val().trim();
  if (!msg) return;
  input.val('');

  appendChatMsg(msg, 'user');
  setTimeout(() => {
    const reply = getChatbotReply(msg.toLowerCase());
    appendChatMsg(reply, 'bot');
  }, 600);
}

function appendChatMsg(msg, sender) {
  const $msgs = $('#chatbotMessages');
  $msgs.append(`<div class="chat-msg ${sender}"><div class="chat-bubble">${msg}</div></div>`);
  $msgs.scrollTop($msgs[0].scrollHeight);
}

function getChatbotReply(msg) {
  const responses = {
    'event': '📅 We have exciting events in Music, Dance, Sports, Tech & more! Go to the <b>Events</b> page to browse and register.',
    'register': '📝 To register: Browse Events → Click an event → Press "Register Now". You need an account first!',
    'signup': '🔐 Click <b>Sign In</b> in the navbar → Switch to "Sign Up" tab → Fill your details and create your account!',
    'login': '🔑 Click <b>Sign In</b> in the top navigation bar and enter your email and password.',
    'admin': '👑 Admin credentials: <b>admin@school.com / admin123</b>. The admin panel has full event management, analytics & more.',
    'what is': '🎓 EduEvents is a premium AI-powered School Event Management System. Students can browse & register for events, admins manage everything!',
    'eduevents': '🎓 EduEvents is your school\'s smart event hub — powered by AI for recommendations, voice input, and real-time analytics!',
    'music': '🎵 Yes! We have Music Fest events. Search "music" on the Events page or use the AI Recommender!',
    'dance': '💃 Dance events are available! Check the Events page and filter by "Dance" category.',
    'sports': '⚽ Sports Day 2026 is coming up! Head to Events and filter by Sports category.',
    'capacity': '📊 Each event shows remaining capacity with a progress bar. Once full, registration closes automatically.',
    'notification': '🔔 Check the Notifications page for latest announcements from the admin team!',
    'ticket': '🎟️ After registering, find all your events under My Tickets (accessible from your profile menu).',
    'voice': '🎙️ Yes! On the Events page, use the AI Recommend section and click the microphone icon to speak your interests!',
    'help': '🤝 I\'m here to help! Ask me about: events, registration, login, admin panel, AI features, or anything else!'
  };

  for (const [key, val] of Object.entries(responses)) {
    if (msg.includes(key)) return val;
  }

  return `🤔 Good question! I'm not sure about that specific topic. Try browsing the <b>Events</b> page or contact your school admin. Is there anything else I can help with?`;
}

/* ============================================================
   COUNTDOWN TIMERS
   ============================================================ */
function initCountdownTimers() {
  setInterval(() => {
    $('.countdown-timer[data-date]').each(function () {
      const target = new Date($(this).attr('data-date'));
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) { $(this).text('Event started!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      $(this).text(`${d}d ${h}h ${m}m`);
    });
  }, 60000);
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const colors = { success: '#22c55e', danger: '#ef4444', info: '#38bdf8', warning: '#f59e0b' };
  $('#toastMsg').text(msg);
  $('.toast-icon').attr('class', `toast-icon fas ${icons[type] || icons.info}`).css('color', colors[type] || colors.info);
  const toast = new bootstrap.Toast(document.getElementById('toastEl'), { delay: 3500 });
  toast.show();
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
$(document).on('keydown', function (e) {
  if (e.key === 'Escape') {
    if (!$('#chatbotPanel').hasClass('d-none')) toggleChatbot();
  }
});
