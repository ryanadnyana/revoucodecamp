// ── DOM refs ──
const greetingEl  = document.getElementById('greeting');
const datetimeEl  = document.getElementById('datetime');
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const timerDisplay  = document.getElementById('timerDisplay');
const pomodoroInput = document.getElementById('pomodoroInput');
const html = document.documentElement;

// ── Theme ──
function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.src = theme === 'dark' ? '/assets/sun.svg' : '/assets/moon.svg';
  localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', () => {
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ── Toast ──
function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

// ── Clock ──
let lastDateStr = '';
let clockInterval = null;

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function updateClock() {
  const now  = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Good night';

  greetingEl.textContent = greeting + '!';

  // Reformat date only when it actually changes (once per day)
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (dateStr !== lastDateStr) lastDateStr = dateStr;

  // Manual time format — avoids expensive toLocaleTimeString every second
  const mins = now.getMinutes();
  const secs = now.getSeconds();
  const h    = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  datetimeEl.textContent = `${lastDateStr} · ${pad(h12)}:${pad(mins)}:${pad(secs)} ${ampm}`;
}

function startClock() {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function stopClock() {
  clearInterval(clockInterval);
}

// Pause clock when tab is hidden to save CPU
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopClock();
  else startClock();
});

// ── Focus Timer ──
let timerDuration = parseInt(localStorage.getItem('pomodoroDuration') || '25', 10);
let timeLeft      = timerDuration * 60;
let timerInterval = null;
let running       = false;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timeLeft);
}

function stopTimer() {
  clearInterval(timerInterval);
  running = false;
}

document.getElementById('applyTimer').addEventListener('click', () => {
  const val = parseInt(pomodoroInput.value, 10);
  if (!val || val < 1) return;
  timerDuration = val;
  localStorage.setItem('pomodoroDuration', val);
  stopTimer();
  timeLeft = timerDuration * 60;
  renderTimer();
});

document.getElementById('startTimer').addEventListener('click', () => {
  if (running) return;
  running = true;
  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      running = false;
      timerDisplay.textContent = '00:00';
      showToast('⏰ Focus session complete!');
      return;
    }
    timeLeft--;
    renderTimer();
  }, 1000);
});

document.getElementById('stopTimer').addEventListener('click', stopTimer);

document.getElementById('resetTimer').addEventListener('click', () => {
  stopTimer();
  timeLeft = timerDuration * 60;
  renderTimer();
});

// ── To-Do List ──
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function getSortedTasks() {
  const sort = document.getElementById('sortSelect').value;
  const copy = [...tasks];
  if (sort === 'az')        copy.sort((a, b) => a.text.localeCompare(b.text));
  else if (sort === 'za')   copy.sort((a, b) => b.text.localeCompare(a.text));
  else if (sort === 'done') copy.sort((a, b) => Number(a.done) - Number(b.done));
  return copy;
}

function renderTasks() {
  const list       = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  list.innerHTML   = '';

  emptyState.classList.toggle('hidden', tasks.length > 0);

  getSortedTasks().forEach(task => {
    const realIndex = tasks.findIndex(t => t.id === task.id);
    const li        = document.createElement('li');
    li.className    = 'task-item' + (task.done ? ' done' : '');

    const checkbox   = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      tasks[realIndex].done = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const span       = document.createElement('span');
    span.className   = 'task-text';
    span.textContent = task.text;

    const actions     = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn     = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title     = 'Edit';
    const editIcon    = document.createElement('img');
    editIcon.src      = '/assets/pencil.svg';
    editIcon.alt      = 'Edit';
    editIcon.width    = 25;
    editIcon.height   = 25;
    editBtn.appendChild(editIcon);
    editBtn.addEventListener('click', () => startEdit(li, span, realIndex));

    const deleteBtn     = document.createElement('button');
    deleteBtn.className = 'btn-icon';
    deleteBtn.title     = 'Delete';
    const deleteIcon    = document.createElement('img');
    deleteIcon.src      = '/assets/trash.svg';
    deleteIcon.alt      = 'Delete';
    deleteIcon.width    = 20;
    deleteIcon.height   = 20;
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.addEventListener('click', () => {
      tasks.splice(realIndex, 1);
      saveTasks();
      renderTasks();
    });

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, span, actions);
    list.appendChild(li);
  });
}

function startEdit(li, span, index) {
  const input     = document.createElement('input');
  input.type      = 'text';
  input.className = 'task-edit-input';
  input.value     = tasks[index].text;
  span.replaceWith(input);
  input.focus();

  function commit() {
    const val = input.value.trim();
    if (val) tasks[index].text = val;
    saveTasks();
    renderTasks();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
}

document.getElementById('addTask').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  renderTasks();
  input.value = '';
}

document.getElementById('sortSelect').addEventListener('change', renderTasks);

// ── Quick Links ──
let links = JSON.parse(localStorage.getItem('links') || '[]');

function saveLinks() {
  localStorage.setItem('links', JSON.stringify(links));
}

function renderLinks() {
  const grid     = document.getElementById('linksGrid');
  grid.innerHTML = '';

  links.forEach((link, i) => {
    const wrapper     = document.createElement('div');
    wrapper.className = 'link-wrapper';

    const a     = document.createElement('a');
    a.className = 'link-btn';
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';

    const favicon              = document.createElement('img');
    favicon.width              = 14;
    favicon.height             = 14;
    favicon.decoding           = 'async';
    favicon.loading            = 'lazy';
    favicon.style.borderRadius = '2px';
    favicon.onerror            = () => { favicon.style.display = 'none'; };
    try {
      favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}`;
    } catch {
      favicon.style.display = 'none';
    }

    const nameSpan       = document.createElement('span');
    nameSpan.textContent = link.name;

    const delBtn       = document.createElement('button');
    delBtn.className   = 'link-delete';
    delBtn.title       = 'Remove';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => {
      e.preventDefault();
      links.splice(i, 1);
      saveLinks();
      renderLinks();
    });

    a.append(favicon, nameSpan);
    wrapper.append(a, delBtn);
    grid.appendChild(wrapper);
  });
}

document.getElementById('addLink').addEventListener('click', addLink);
document.getElementById('linkUrl').addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

function addLink() {
  const name = document.getElementById('linkName').value.trim();
  const url  = document.getElementById('linkUrl').value.trim();
  if (!name || !url) return;
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  links.push({ name, url: fullUrl });
  saveLinks();
  renderLinks();
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value  = '';
}

// ── Confirm Modal ──
const modal      = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo  = document.getElementById('confirmNo');

function openModal()  { modal.classList.remove('hidden'); modal.classList.add('visible'); }
function closeModal() { modal.classList.add('hidden'); modal.classList.remove('visible'); }

document.getElementById('clearAll').addEventListener('click', () => {
  if (tasks.length === 0) { showToast('No tasks to clear'); return; }
  openModal();
});

confirmYes.addEventListener('click', () => {
  tasks = [];
  saveTasks();
  renderTasks();
  closeModal();
  showToast('All tasks cleared');
});

confirmNo.addEventListener('click', closeModal);

// ── Init ──
applyTheme(localStorage.getItem('theme') || 'light');
pomodoroInput.value = timerDuration;
renderTimer();
renderTasks();
renderLinks();
startClock();
