const STORAGE_KEY = "executiveTrackerData";

const todayDateEl = document.getElementById("todayDate");
const taskForm = document.getElementById("taskForm");
const taskListEl = document.getElementById("taskList");
const tasksDoneEl = document.getElementById("tasksDone");
const focusMinutesEl = document.getElementById("focusMinutes");
const currentStreakEl = document.getElementById("currentStreak");
const rewardPointsEl = document.getElementById("rewardPoints");
const nextRewardEl = document.getElementById("nextReward");
const badgeListEl = document.getElementById("badgeList");
const chart = document.getElementById("weeklyChart");
const ctx = chart.getContext("2d");

const REWARD_MILESTONES = [50, 150, 300, 500, 750, 1000];
const BADGES = [
  { points: 50, label: "Momentum Starter" },
  { points: 150, label: "Consistency Architect" },
  { points: 300, label: "Skill Sprinter" },
  { points: 500, label: "Performance Leader" },
  { points: 750, label: "Corporate Athlete" },
  { points: 1000, label: "Elite Growth Operator" },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function loadData() {
  const fallback = {
    tasks: [],
    completedLog: {},
    points: 0,
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dayLabel(dateString) {
  const d = new Date(`${dateString}T00:00:00`);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function addTask(task) {
  state.tasks.push(task);
  saveData();
  render();
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  if (task.completed) {
    task.completedAt = getToday();
    state.points += task.priority === "High" ? 20 : task.priority === "Medium" ? 14 : 10;
  } else {
    task.completedAt = null;
    state.points = Math.max(0, state.points - 10);
  }

  saveCompletionLog();
  saveData();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveCompletionLog();
  saveData();
  render();
}

function saveCompletionLog() {
  const log = {};
  state.tasks
    .filter((t) => t.completed && t.completedAt)
    .forEach((t) => {
      log[t.completedAt] = (log[t.completedAt] || 0) + 1;
    });

  state.completedLog = log;
}

function getWeeklyMetrics() {
  const points = [];
  const today = new Date(`${getToday()}T00:00:00`);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().split("T")[0];
    points.push({ date, done: state.completedLog[date] || 0 });
  }

  return points;
}

function calculateStreak() {
  const completedDays = Object.keys(state.completedLog)
    .filter((k) => state.completedLog[k] > 0)
    .sort();

  if (completedDays.length === 0) return 0;

  let streak = 0;
  let cursor = new Date(`${getToday()}T00:00:00`);

  while (true) {
    const key = cursor.toISOString().split("T")[0];
    if (state.completedLog[key] > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getUnlockedBadges() {
  return BADGES.filter((b) => state.points >= b.points);
}

function getNextRewardText() {
  const next = REWARD_MILESTONES.find((m) => m > state.points);
  if (!next) return "All milestone rewards unlocked. Maintain excellence!";

  return `${next - state.points} points away from ${next}-point reward.`;
}

function renderList() {
  if (!state.tasks.length) {
    taskListEl.innerHTML = `<p class="task-meta">No tasks in pipeline yet. Add a task to begin day-wise tracking.</p>`;
    return;
  }

  const sorted = [...state.tasks].sort((a, b) => a.date.localeCompare(b.date));
  taskListEl.innerHTML = sorted
    .map(
      (task) => `
      <article class="task-item">
        <div>
          <strong>${task.title}</strong>
          <p class="task-meta">${task.category} • ${task.priority} priority • ${task.minutes} mins • ${dayLabel(
        task.date
      )}${task.completed ? ` • Completed on ${dayLabel(task.completedAt)}` : ""}</p>
        </div>
        <div class="task-actions">
          <button class="done" data-action="toggle" data-id="${task.id}">${
        task.completed ? "Undo" : "Complete"
      }</button>
          <button class="delete" data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </article>`
    )
    .join("");
}

function renderBadges() {
  const unlocked = getUnlockedBadges();
  badgeListEl.innerHTML = unlocked.length
    ? unlocked.map((b) => `<li>${b.label}</li>`).join("")
    : "<li>Start completing tasks to unlock your first badge</li>";
}

function renderChart() {
  const weekly = getWeeklyMetrics();
  const width = chart.width;
  const height = chart.height;
  const padding = 36;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const maxDone = Math.max(...weekly.map((w) => w.done), 1);

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  weekly.forEach((entry, i) => {
    const x = padding + (i / (weekly.length - 1)) * graphWidth;
    const y = height - padding - (entry.done / maxDone) * graphHeight;

    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    ctx.fillStyle = "#4fd1ff";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a6b4d8";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(entry.done.toString(), x - 4, y - 10);
    ctx.fillText(dayLabel(entry.date).split(",")[0], x - 18, height - 14);
  });

  ctx.strokeStyle = "#72e3a6";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderStats() {
  const today = getToday();
  const tasksDone = state.tasks.filter((t) => t.completed && t.completedAt === today).length;
  const minutes = state.tasks
    .filter((t) => t.completed && t.completedAt === today)
    .reduce((sum, t) => sum + Number(t.minutes), 0);
  const streak = calculateStreak();

  tasksDoneEl.textContent = tasksDone;
  focusMinutesEl.textContent = minutes;
  currentStreakEl.textContent = streak;
  rewardPointsEl.textContent = state.points;
  nextRewardEl.textContent = getNextRewardText();
}

function render() {
  todayDateEl.textContent = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  renderList();
  renderStats();
  renderBadges();
  renderChart();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("taskName").value.trim();
  const category = document.getElementById("taskCategory").value;
  const priority = document.getElementById("taskPriority").value;
  const date = document.getElementById("taskDate").value;
  const minutes = document.getElementById("taskMinutes").value;

  if (!title || !date) return;

  addTask({
    id: crypto.randomUUID(),
    title,
    category,
    priority,
    date,
    minutes,
    completed: false,
    completedAt: null,
  });

  taskForm.reset();
  document.getElementById("taskDate").value = getToday();
  document.getElementById("taskMinutes").value = 30;
});

taskListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  if (action === "toggle") toggleTask(id);
  if (action === "delete") deleteTask(id);
});

const state = loadData();
document.getElementById("taskDate").value = getToday();
render();
