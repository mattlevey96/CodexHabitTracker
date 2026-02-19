import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBf_WMIPOHkfGN14IKMBGdZblbp13iU96A",
  authDomain: "codexhabittracker.firebaseapp.com",
  projectId: "codexhabittracker",
  storageBucket: "codexhabittracker.firebasestorage.app",
  messagingSenderId: "370716445308",
  appId: "1:370716445308:web:235ebf09d1cbb7676f57f9",
  measurementId: "G-03LFHWD02R",
};

const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && !value.startsWith("YOUR_")
);

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  todayProgress: document.getElementById("todayProgress"),
  weekProgress: document.getElementById("weekProgress"),
  tasksByProject: document.getElementById("tasksByProject"),
  emptyState: document.getElementById("emptyState"),
  taskForm: document.getElementById("taskForm"),
  taskName: document.getElementById("taskName"),
  taskProject: document.getElementById("taskProject"),
  taskWorkstream: document.getElementById("taskWorkstream"),
  taskAssignee: document.getElementById("taskAssignee"),
  taskDueDate: document.getElementById("taskDueDate"),
  clearToday: document.getElementById("clearToday"),
  taskItemTemplate: document.getElementById("taskItemTemplate"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  signUpBtn: document.getElementById("signUpBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authStatus: document.getElementById("authStatus"),
  authMessage: document.getElementById("authMessage"),
  configWarning: document.getElementById("configWarning"),
  taskEntryCard: document.getElementById("taskEntryCard"),
  tasksCard: document.getElementById("tasksCard"),
};

let app;
let auth;
let db;
let activeUser = null;
let tasks = [];
let unsubscribeTasks = null;

elements.todayLabel.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

if (!isFirebaseConfigured) {
  elements.configWarning.hidden = false;
  elements.authMessage.textContent = "Add Firebase credentials to continue.";
  setSignedInView(false);
} else {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    activeUser = user;
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }

    if (!user) {
      tasks = [];
      setSignedInView(false);
      render();
      return;
    }

    elements.authMessage.textContent = "";
    setSignedInView(true, user.email || user.uid);

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "asc"));
    unsubscribeTasks = onSnapshot(q, (snapshot) => {
      tasks = snapshot.docs.map((record) => normalizeTask(record.id, record.data()));
      render();
    });
  });
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;

  const email = String(elements.authEmail.value || "").trim();
  const password = String(elements.authPassword.value || "");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    elements.authMessage.textContent = "Signed in.";
  } catch (error) {
    elements.authMessage.textContent = normalizeAuthError(error);
  }
});

elements.signUpBtn.addEventListener("click", async () => {
  if (!auth) return;

  const email = String(elements.authEmail.value || "").trim();
  const password = String(elements.authPassword.value || "");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    elements.authMessage.textContent = "Account created and signed in.";
  } catch (error) {
    elements.authMessage.textContent = normalizeAuthError(error);
  }
});

elements.signOutBtn.addEventListener("click", async () => {
  if (!auth) return;

  await signOut(auth);
  elements.authMessage.textContent = "Signed out.";
});

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db || !activeUser) return;

  const draft = {
    name: cleanText(elements.taskName.value),
    project: cleanText(elements.taskProject.value),
    workstream: cleanText(elements.taskWorkstream.value),
    assignee: cleanText(elements.taskAssignee.value),
    dueDate: sanitizeDate(elements.taskDueDate.value),
  };

  if (!draft.name || !draft.project || !draft.workstream || !draft.assignee || !draft.dueDate) {
    return;
  }

  await addDoc(collection(db, "users", activeUser.uid, "tasks"), {
    ...draft,
    isComplete: false,
    completedOn: "",
    createdAt: new Date().toISOString(),
  });

  elements.taskForm.reset();
  elements.taskName.focus();
});

elements.clearToday.addEventListener("click", async () => {
  if (!db || !activeUser) return;

  const today = getTodayKey();
  const updates = tasks
    .filter((task) => task.isComplete && task.completedOn === today)
    .map((task) =>
      updateDoc(doc(db, "users", activeUser.uid, "tasks", task.id), {
        isComplete: false,
        completedOn: "",
      })
    );

  await Promise.all(updates);
});

async function toggleTask(id) {
  if (!db || !activeUser) return;

  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  const today = getTodayKey();
  await updateDoc(doc(db, "users", activeUser.uid, "tasks", id), {
    isComplete: !task.isComplete,
    completedOn: !task.isComplete ? today : "",
  });
}

async function deleteTask(id) {
  if (!db || !activeUser) return;
  await deleteDoc(doc(db, "users", activeUser.uid, "tasks", id));
}

function setSignedInView(isSignedIn, identity = "") {
  elements.taskEntryCard.hidden = !isSignedIn;
  elements.tasksCard.hidden = !isSignedIn;
  elements.signOutBtn.hidden = !isSignedIn;
  elements.authStatus.textContent = isSignedIn ? `Signed in as ${identity}` : "Signed out";
}

function normalizeTask(id, raw) {
  return {
    id,
    name: cleanText(raw.name),
    project: cleanText(raw.project),
    workstream: cleanText(raw.workstream),
    assignee: cleanText(raw.assignee),
    dueDate: sanitizeDate(raw.dueDate) || getTodayKey(),
    isComplete: Boolean(raw.isComplete),
    completedOn: sanitizeDate(raw.completedOn) || "",
    createdAt: String(raw.createdAt || ""),
  };
}

function render() {
  elements.tasksByProject.innerHTML = "";

  const grouped = groupTasks(tasks);
  const projects = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  for (const project of projects) {
    const projectNode = document.createElement("section");
    projectNode.className = "project-group";

    const projectTitle = document.createElement("h3");
    projectTitle.className = "project-title";
    projectTitle.textContent = project;

    projectNode.appendChild(projectTitle);

    const workstreams = Object.keys(grouped[project]).sort((a, b) => a.localeCompare(b));

    for (const workstream of workstreams) {
      const workstreamNode = document.createElement("section");
      workstreamNode.className = "workstream-group";

      const workstreamTitle = document.createElement("h4");
      workstreamTitle.className = "workstream-title";
      workstreamTitle.textContent = workstream;

      const list = document.createElement("div");
      list.className = "task-list";

      const items = grouped[project][workstream].sort(sortByDueDateThenName);
      for (const task of items) {
        list.appendChild(renderTask(task));
      }

      workstreamNode.append(workstreamTitle, list);
      projectNode.appendChild(workstreamNode);
    }

    elements.tasksByProject.appendChild(projectNode);
  }

  const todayStats = getDayStats(getTodayKey());
  const weekStats = getWeekStats(new Date());

  elements.todayProgress.textContent = `${todayStats.completed}/${todayStats.total}`;
  elements.weekProgress.textContent = `${weekStats.completed}/${weekStats.total}`;
  elements.emptyState.style.display = tasks.length ? "none" : "block";
}

function renderTask(task) {
  const clone = elements.taskItemTemplate.content.firstElementChild.cloneNode(true);

  clone.querySelector(".task-name").textContent = task.name;
  clone.querySelector(".task-meta").textContent = `${task.assignee} | Due ${formatDate(task.dueDate)}`;
  clone.querySelector(".toggle-btn").addEventListener("click", () => toggleTask(task.id));
  clone.querySelector(".delete-btn").addEventListener("click", () => deleteTask(task.id));

  if (task.isComplete) {
    clone.classList.add("done");
  }

  return clone;
}

function getDayStats(dayKey) {
  const dayTasks = tasks.filter((task) => task.dueDate === dayKey);
  return {
    total: dayTasks.length,
    completed: dayTasks.filter((task) => task.isComplete).length,
  };
}

function getWeekStats(anchorDate) {
  const start = startOfWeek(anchorDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startKey = dateToKey(start);
  const endKey = dateToKey(end);

  const weekTasks = tasks.filter((task) => task.dueDate >= startKey && task.dueDate <= endKey);
  return {
    total: weekTasks.length,
    completed: weekTasks.filter((task) => task.isComplete).length,
  };
}

function groupTasks(items) {
  const grouped = {};

  for (const task of items) {
    if (!grouped[task.project]) {
      grouped[task.project] = {};
    }
    if (!grouped[task.project][task.workstream]) {
      grouped[task.project][task.workstream] = [];
    }
    grouped[task.project][task.workstream].push(task);
  }

  return grouped;
}

function sortByDueDateThenName(a, b) {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }
  return a.name.localeCompare(b.name);
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function sanitizeDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return "";
  }
  return text;
}

function getTodayKey() {
  return dateToKey(new Date());
}

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeAuthError(error) {
  const message = String(error?.message || "Authentication failed.");
  if (message.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (message.includes("auth/email-already-in-use")) return "Email is already in use.";
  if (message.includes("auth/weak-password")) return "Use at least 6 characters for password.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email.";
  return message;
}

render();

