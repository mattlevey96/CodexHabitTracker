# Codex Habit Tracker

A clean, mobile-friendly habit tracker built with plain HTML, CSS, and JavaScript.

## Features

- Add habits with a name and category
- Toggle each habit complete/incomplete for the current day
- Group habits by category
- Track daily streaks per habit (`current` and `best`)
- Store data in browser `localStorage` (no backend required)

## Tech Stack

- `index.html`
- `styles.css`
- `script.js`

This project is fully static and suitable for GitHub Pages hosting.

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

Open the URL printed in your terminal.

## Project Structure

- `index.html` - App structure and UI skeleton
- `styles.css` - Responsive styling and visual design
- `script.js` - Habit state, rendering, local persistence, and streak logic

## Notes

- Data is saved per browser profile using `localStorage`.
- `Reset Today` clears only today's completions and keeps historical streak data.
