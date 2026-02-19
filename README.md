# Codex Work Task Tracker

A clean, mobile-friendly work task tracker built with plain HTML, CSS, and JavaScript.

## Features

- Email/password login with Firebase Authentication
- Cloud task storage in Firestore, scoped per user (`users/{uid}/tasks`)
- Add tasks with:
  - Task name
  - Project
  - Workstream (within project)
  - Assignee
  - Due date
- Toggle task completion
- Two-level grouping: `Project -> Workstream`
- Progress metrics:
  - Today: completed/total tasks due today
  - This week: completed/total tasks due this week

## Tech Stack

- `index.html`
- `styles.css`
- `script.js` (ES modules)
- Firebase Auth + Firestore (CDN modules)

## Firebase Setup

1. Create a Firebase project at `https://console.firebase.google.com/`.
2. In `Project settings -> General`, add a **Web app** and copy the config values.
3. In `Authentication -> Sign-in method`, enable **Email/Password**.
4. In `Firestore Database`, create a database (production or test mode).
5. In Firestore Rules, use:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. In `script.js`, replace the placeholder `firebaseConfig` with your real values.
7. In Firebase `Authentication -> Settings -> Authorized domains`, add your GitHub Pages domain if needed.

## Run Locally

### Option 1: Python

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

### Option 2: Node (if npm/npx is working)

```bash
npx serve .
```

## Deploy

This project is static and works with GitHub Pages.
