# Engram Workflow

This document describes the current working flow of Engram after simplifying it for personal learning use.

## Purpose

Engram is now a personal study app centered around:

- topic-based study with AI-generated hierarchical syllabi
- flashcard review with **Bumble-style swipe gestures**
- adaptive quiz practice with **seamless transitions**
- spaced repetition with **silent progress tracking**
- simple streak and progress-style motivation
- AI tutoring (English-focused with friendly Hinglish sprinkles)
- **High-performance UI** with GPU acceleration and lazy reveals

Removed from the main flow:

- leaderboard
- install bonus
- manual settle-up expense flow
- inactivity penalties
- hard/medium/easy manual rating buttons (replaced by gestures)

## High-Level User Flow

1. Open the frontend.
2. Enter the app from the splash screen.
3. Land on the home screen.
4. View your **Global Progress Dashboard** (Mastery, Due Today, Total Learned).
5. Choose one of the main study paths:
   - `Topics` for topic-based learning or to generate a new syllabus with AI
   - `Quiz` for a random quiz session
6. Study cards or answer quiz questions using **swipe gestures**.
7. The backend updates:
   - spaced repetition data (via silent rating)
   - streak data
   - progress metrics

## Frontend Flow

Main frontend file:

- [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### App Start

The app starts in `App` and reads the current hash route.

Important routes:

- `/` -> splash if logged out, home if logged in
- `/login` -> login/register page
- `/home` -> home dashboard
- `/topics` -> topic list + AI generation button
- `/learn/:topic_id` -> flashcard study (gestures: Swipe Left/Next, Swipe Right/Prev, Swipe Up/Deep Dive)
- `/quiz/:topic_id` -> topic quiz (gesture: Swipe Left/Next after answer)
- `/quiz/random` -> mixed quiz

### Performance & Animations

The UI is optimized for a premium mobile feel:

- **GPU Acceleration**: Uses `willChange: 'transform'` on card containers for 60fps animations.
- **Lazy Reveal**: Custom `useLazyReveal` hook (IntersectionObserver) for staggered card entrance with 60ms delays.
- **Background Prefetching**: Quiz batching silently fetches the next 10 MCQs when the user reaches the last 3.
- **Staggered Animations**: MCQ options and syllabus cards use `fadeSlideUp` with increasing delays.

### Home Screen

The home page features a high-fidelity **Progress Dashboard**:

- **Overall Mastery Ring**: A large, animated gradient ring showing the aggregate mastery across all topics.
- **Due for Review**: Total count of items needing review (orange clock-3 icon).
- **Items Learned**: Percentage of total cards/MCQs successfully encountered (emerald check-circle icon).
- **Current Streak**: Days active with a "flame" indicator.
- **Quick Start Actions**: Direct, premium-styled links to `Continue Path` and `Quick Practice`.
- **AI Insight Analysis**: Personalized strategy analysis based on study history (identifies weak topics and suggests focus).

### Topics Screen

The topics page displays parent syllabi and subtopics with rich metadata:

- **Mastery percentage** and animated progress bar (1000ms duration).
- **Status Badges**:
  - `Not Started`: Grey badge for untouched topics.
  - `In Progress`: Blue badge for active learning.
  - `Mastered`: Emerald badge for topics >80% mastery.
- **Due count pill**: An animated orange pill (e.g., "12 Due") highlighting items needing review.
- **Last studied** timestamp (e.g., "Studied 2h ago") using human-readable relative time logic.

**Due Today Banner**: A high-contrast orange "Action Required" banner at the top of subtopic views if any items are due, providing a one-tap "Start Review" shortcut.

Each subtopic offers:
- `Study` — study cards using swipe gestures (silently rates "Good" on move).
- `Quiz` — MCQ quiz with smooth transitions and AI explanations.
- `Reset Progress` — clears all SM-2 data for that specific topic.

## Learn Flow (Flashcards)

Main component: `Learn` in [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### Gestures

1. **Swipe Right**: Move to next card. Triggers a **silent `POST /card/rate` (rating: 2)** to update the spaced repetition engine.
2. **Swipe Left**: Move to previous card.
3. **Swipe Up**: Trigger **AI Deep Dive** drawer for the current card.

### AI Persona (Tutoring)

- **English-Only Core**: AI hints and explanations are generated in technical English.
- **Friendly Sprinkles**: Conversational Hinglish interjections (e.g., "Arre waah!", "Think about it, bhai") are used for hints and deep dives to keep the learner engaged.

## Quiz Flow

Main component: `Quiz` in [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### Interaction

1. **Option Selection**: MCQ options reveal with staggered `fadeSlideUp` animations.
2. **AI Solution Reveal**: Correctness is verified, and a friendly AI explanation is shown immediately.
3. **Swipe Navigation**: Once a question is answered, the user swipes left to "throw" the card and bring up the next question seamlessly.
4. **Smooth Transitions**: GPU-accelerated shrinks and slides ensure zero lag between questions.

## Data Flow Summary

### Dashboard & Topics
- frontend -> `GET /topics`
- backend -> returns calculated mastery, due counts, last studied timestamps, and item counts.

### Spaced Repetition (SRS)
- frontend -> `POST /card/rate` (triggered silently on swipe)
- backend -> `sm2.py` calculates next interval, easiness factor, and due date.

### Quiz Performance
- frontend -> `POST /answer`
- backend -> `adaptive.py` updates MCQ mastery and streak data.

## What To Change Next

Possible next steps:
- add a topic search/filter bar on the Topics screen.
- implement "Topic Level-up" celebrations (confetti) on reaching 100% mastery.
- add a "Study Streak" calendar view on the Home page.
- add export to PDF/Anki functionality.


