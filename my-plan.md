# Goal & Routine Tracker - PRD

## Overview
A minimal app to track daily to-dos, long-term goals, and weekly routines. Uses natural language input to log what you did each day and automatically updates your progress.

---

## Feature 1: Daily To-Dos (Notion-style Editor)
- WYSIWYG block-based editor
- Blocks: checkboxes, bullet points, toggles (collapsible sections)
- Drag-and-drop to reorder blocks
- Each day gets its own toggle section
- Nest content under toggles: sub-checkboxes, bullets
- Move items between day toggles
- Check off to-dos inline
- Test: Can create a toggle, add a checkbox inside, and check it off in under 10 seconds
- Test: Can drag a block from one toggle to another

## Feature 2: Long-Term Goals
- Separate view for long-term goals
- Break into milestones with optional due dates
- Visible alongside but distinct from daily tasks
- Test: Can view all long-term goals in one screen

## Feature 3: Weekly Routines
- Create routines with frequency (e.g., "cardio 3x per week")
- Each routine can have metadata/setup notes (e.g., "3.6 mph, 40 min")
- Metadata is set once as your baseline/target
- See all weekly routines in one clear view
- Shows progress: "2 of 3 this week"
- Test: Can see all routines and their weekly progress at a glance

## Feature 4: Natural Language Daily Log
- Single input field: "What did you do today?"
- AI parses your input and auto-checks matching routines
- Example: "Worked out, did 40 min cardio, meditated" → checks off those 3 routines
- Also logs the raw text as a daily journal entry
- Test: Typing a sentence checks off relevant routines within 2 seconds

## Feature 5: History View
- Calendar or list showing what you completed and when
- Can drill into any day to see what you logged
- No streak counters - just neutral historical data
- Test: Can see any past day's completions in 2 taps

---

## UI Decisions
- Minimal, clean design with plenty of white space
- Three clear sections: Daily To-Dos, Weekly Routines, Long-Term Goals
- Single-column layout that works on mobile and desktop
- Prominent "log today" input - this is the main interaction
- No gamification, badges, or streak counters

## Technical Decisions
- Web app (responsive design for mobile browsers)
- AI integration for parsing natural language input (OpenAI or similar)
- Local-first storage using IndexedDB
- Optional cloud sync later
- PWA-ready for mobile home screen install

---

## User Flow
1. Open app → See today's to-dos and weekly routines
2. Throughout day: Check off to-dos as needed
3. End of day: Type what you did in natural language
4. AI auto-checks routines, logs entry to history
5. Weekly: Review routine progress, adjust as needed
6. Anytime: Check long-term goals, update milestones

---

## Out of Scope (for now)
- Native mobile apps
- Notifications/reminders
- Team/shared goals
- Data export
- Calendar integrations
