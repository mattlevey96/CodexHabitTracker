const STORAGE_KEY = "habit-tracker-v1";

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  completedToday: document.getElementById("completedToday"),
  bestStreak: document.getElementById("bestStreak"),
  habitsByCategory: document.getElementById("habitsByCategory"),
  emptyState: document.getElementById("emptyState"),
  habitForm: document.getElementById("habitForm"),
  habitName: document.getElementById("habitName"),
  habitCategory: document.getElementById("habitCategory"),
  resetToday: document.getElementById("resetToday"),
  habitItemTemplate: document.getElementById("habitItemTemplate"),
};

let habits = loadHabits();

elements.todayLabel.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

elements.habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addHabit(elements.habitName.value, elements.habitCategory.value);
  elements.habitForm.reset();
  elements.habitName.focus();
});

elements.resetToday.addEventListener("click", () => {
  const today = getTodayKey();
  habits = habits.map((habit) => {
    if (habit.completedDates.includes(today)) {
      return {
        ...habit,
        completedDates: habit.completedDates.filter((dateKey) => dateKey !== today),
      };
    }
    return habit;
  });
  persistAndRender();
});

function addHabit(name, category) {
  const cleanName = name.trim();
  const cleanCategory = normalizeCategory(category);

  if (!cleanName || !cleanCategory) {
    return;
  }

  habits.push({
    id: crypto.randomUUID(),
    name: cleanName,
    category: cleanCategory,
    completedDates: [],
    createdAt: new Date().toISOString(),
  });

  persistAndRender();
}

function deleteHabit(id) {
  habits = habits.filter((habit) => habit.id !== id);
  persistAndRender();
}

function toggleHabit(id) {
  const today = getTodayKey();

  habits = habits.map((habit) => {
    if (habit.id !== id) {
      return habit;
    }

    const isDone = habit.completedDates.includes(today);
    return {
      ...habit,
      completedDates: isDone
        ? habit.completedDates.filter((dateKey) => dateKey !== today)
        : [...habit.completedDates, today],
    };
  });

  persistAndRender();
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  render();
}

function loadHabits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        id: item.id,
        name: String(item.name || "Habit").trim(),
        category: normalizeCategory(item.category || "General"),
        completedDates: Array.isArray(item.completedDates)
          ? [...new Set(item.completedDates.map(String))].sort()
          : [],
        createdAt: item.createdAt || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function render() {
  elements.habitsByCategory.innerHTML = "";

  const grouped = groupByCategory(habits);
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  for (const category of categories) {
    const group = document.createElement("section");
    group.className = "category-group";

    const title = document.createElement("h3");
    title.className = "category-title";
    title.textContent = category;

    const list = document.createElement("div");
    list.className = "habit-list";

    for (const habit of grouped[category]) {
      const node = renderHabit(habit);
      list.appendChild(node);
    }

    group.append(title, list);
    elements.habitsByCategory.appendChild(group);
  }

  const today = getTodayKey();
  const completedCount = habits.filter((habit) => habit.completedDates.includes(today)).length;

  elements.completedToday.textContent = String(completedCount);
  elements.bestStreak.textContent = String(
    habits.reduce((best, habit) => Math.max(best, calculateStreak(habit.completedDates).best), 0)
  );
  elements.emptyState.style.display = habits.length ? "none" : "block";
}

function renderHabit(habit) {
  const today = getTodayKey();
  const clone = elements.habitItemTemplate.content.firstElementChild.cloneNode(true);
  const done = habit.completedDates.includes(today);
  const streak = calculateStreak(habit.completedDates);

  clone.querySelector(".habit-name").textContent = habit.name;
  clone.querySelector(".habit-meta").textContent = `Current streak: ${streak.current} day${
    streak.current === 1 ? "" : "s"
  } | Best: ${streak.best}`;
  clone.querySelector(".toggle-btn").addEventListener("click", () => toggleHabit(habit.id));
  clone.querySelector(".delete-btn").addEventListener("click", () => deleteHabit(habit.id));

  if (done) {
    clone.classList.add("done");
  }

  return clone;
}

function normalizeCategory(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "General";
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function groupByCategory(items) {
  return items.reduce((acc, habit) => {
    if (!acc[habit.category]) {
      acc[habit.category] = [];
    }
    acc[habit.category].push(habit);
    return acc;
  }, {});
}

function calculateStreak(completedDates) {
  if (!completedDates.length) {
    return { current: 0, best: 0 };
  }

  const sortedDays = [...new Set(completedDates)].sort();

  let best = 1;
  let run = 1;

  for (let i = 1; i < sortedDays.length; i += 1) {
    const prev = dateKeyToUtc(sortedDays[i - 1]);
    const curr = dateKeyToUtc(sortedDays[i]);
    const diffDays = Math.round((curr - prev) / 86400000);

    if (diffDays === 1) {
      run += 1;
      best = Math.max(best, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const set = new Set(sortedDays);
  const today = getTodayKey();
  const yesterday = shiftDayKey(today, -1);

  let current = 0;
  if (set.has(today) || set.has(yesterday)) {
    let cursor = set.has(today) ? today : yesterday;

    while (set.has(cursor)) {
      current += 1;
      cursor = shiftDayKey(cursor, -1);
    }
  }

  return { current, best };
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDayKey(dayKey, shiftDays) {
  const date = dateKeyToUtc(dayKey);
  date.setUTCDate(date.getUTCDate() + shiftDays);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToUtc(dayKey) {
  return new Date(`${dayKey}T00:00:00Z`);
}

render();
