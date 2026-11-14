<div align="center">

# 📘 MedStudy Planner

### A study planner built for medical students

**Plan your study time · Track what you know · Avoid burnout**

🌐 **[bobbie-ungalvanized-tatiana.ngrok-free.dev](https://bobbie-ungalvanized-tatiana.ngrok-free.dev/)**

</div>

---

## 📑 Contents

1. [What is MedStudy Planner?](#-what-is-medstudy-planner)
2. [Who uses it](#-who-uses-it)
3. [Getting started](#-getting-started)
4. [A tour for students](#-a-tour-for-students)
   - [Dashboard](#-dashboard)
   - [Calendar](#-calendar)
   - [Subjects & Topics](#-subjects--topics)
   - [Activities](#-activities)
   - [Analytics](#-analytics)
   - [Profile Settings](#-profile-settings)
5. [How the smart planner works](#-how-the-smart-planner-works)
6. [For teachers](#-for-teachers-class-overview)
7. [For administrators](#-for-administrators-users)
8. [Privacy & security](#-privacy--security)
9. [Hosting, updates & backups](#-hosting-updates--backups)
10. [Known limitations & ideas for later](#-known-limitations--ideas-for-later)
11. [Glossary](#-glossary)

---

## 🩺 What is MedStudy Planner?

Medical school means many subjects, packed timetables and exams that all come at once.
**MedStudy Planner** keeps all of that in one place and does the planning for you:

| | |
|---|---|
| 🗓️ **One timetable** | Classes, meals, sleep, sport, work and study in a single weekly calendar. |
| 🧠 **Smart scheduling** | Finds free time and fills it with study sessions, based on exam dates and on how well you know each topic. |
| 🚦 **Knowledge tracking** | Every topic is rated 🟢 green, 🟡 yellow or 🔴 red, so you can see at a glance what still needs work. |
| 🔁 **Spaced repetition** | Topics come back for review just before you are likely to forget them. |
| 💚 **Wellbeing first** | Warns you about overloaded days before they happen, and suggests what to move. |
| 👩‍🏫 **Teacher insights** | Teachers see anonymous, group-level trends to spot subjects the class is struggling with. |

---

## 👥 Who uses it

The app has three roles. Everyone who signs up starts as a **student**. Teacher and admin access is given by an administrator.

| Role | What they see | What they can do |
|---|---|---|
| 🎓 **Student** | Dashboard, Calendar, Subjects, Activities, Analytics | Manage their own study plan. Their data is private to them. |
| 👩‍🏫 **Teacher** | Class Overview | View anonymous, aggregated statistics of students who agreed to share. |
| 🛠️ **Admin** | Class Overview, Users | Everything a teacher sees, plus giving and removing the teacher and admin roles. |

---

## 🚀 Getting started

### 1. Open the app

Go to **https://bobbie-ungalvanized-tatiana.ngrok-free.dev/**

> 💡 **Note:** The site is published through *ngrok*. On the first visit you may see an ngrok notice page.
> Click **Visit Site** to continue. It is a one-time step and does not affect the app.

### 2. Create an account

Click **"Don't have an account? Sign up"** and fill in:

| Field | Notes |
|---|---|
| First name, last name | Required |
| Date of birth | Required |
| Email address | This is your login |
| Password | At least **8 characters**, with an **uppercase letter**, a **lowercase letter** and a **digit** |
| ☑️ Data sharing | Optional. Lets your *anonymous* data count towards teacher statistics. You can change this later. |

### 3. Choose how to start

On your first visit the app offers two options:

| Option | What happens |
|---|---|
| ✨ **Start with Demo Data** | Fills your account with a realistic example: 4 subjects (Anatomy, Physiology, Biochemistry, Pharmacology), 17 topics with different knowledge levels, and a full weekly routine (lectures, labs, meals, sleep, gym, free time). **Best for trying the app out.** |
| 📄 **Start Fresh** | An empty account. You add your own subjects and timetable. |

> 💡 **Tip:** To see everything the app can do in two minutes, pick **Start with Demo Data**, then press
> **Plan Sessions** on the Dashboard and open the **Calendar**.

---

## 🎓 A tour for students

The menu on the left has five sections. Your name in the top-right corner opens **Profile Settings** and **Sign Out**.

### 📊 Dashboard

Your home screen. It shows what matters today:

- ⚠️ **Attention Required**: lists subjects in *Determined* or *Emergency* mode.
- 🔔 **Workload warnings** from the planner, colour-coded by severity (🔴 high, 🟠 medium, 🔵 low), each with concrete suggestions.
- ✨ **Study Planner**: choose **7, 14 or 28 days** and press **Plan Sessions** (or **Re-plan**). The app fills your free time with study sessions and tells you how many it planned.
- 🔢 **Quick numbers**: today's activities (done / total), number of subjects and topics, and the share of topics that are well known.
- 🚦 **Knowledge Distribution**: how many topics are green, yellow and red.
- 📅 **Upcoming Exams**: the next three exams with a countdown in days.
- ⚡ **Quick Actions**: *Add Subject*, *Add Activity*, *View Calendar*, *Plan My Week*.

### 🗓️ Calendar

A **weekly calendar** (Sunday to Saturday, 24 hours) showing everything in your life:

- Use **Today**, **◀** and **▶** to move between weeks.
- **Click an empty slot** to add an activity at that day and hour.
- **Click an activity** to view, edit or delete it.
- Activities are coloured by their **subject colour**, or by their type (class, meal, sleep, and so on).
- Repeating activities (for example a lecture every Monday, Wednesday and Friday) appear on every matching day automatically.

### 📚 Subjects & Topics

This is where you describe *what* you need to learn.

**A subject** (e.g. *Anatomy*) has:

| Setting | Options | Meaning |
|---|---|---|
| **Name** | free text | e.g. "Anatomy" |
| **Exam date** | optional | The planner stops scheduling sessions for a subject on its exam day |
| **Study strategy** | 🖐️ Manual · 🚦 Traffic Light · 🔁 Active Recall | How the planner picks what to study (see [below](#-how-the-smart-planner-works)) |
| **Mode** | 🌿 Relaxed · 🎯 Determined · 🚨 Emergency | How urgent the subject is: 1, 2 or 3 study sessions per day |
| **Weight (priority)** | 1–10 slider | Decides which subject goes first when two are equally urgent |
| **Colour** | 10 colours | Used in the calendar |

**A topic** (e.g. *Heart Structure*) belongs to a subject and has:

- a **knowledge level**: 🟢 *Well Known* · 🟡 *Partially Known* · 🔴 *Needs Work*
- optional **notes**
- **Last studied** and **Next review** dates, which the app fills in for you

Click a subject to expand its topics. Use ➕ to add a topic, ✏️ to edit, 🗑️ to delete.

> ⚠️ **Deleting a subject also deletes its topics and its activities.** The app asks for confirmation first.

### ✅ Activities

A list of everything on your timetable, with filters: **All · Scheduled · Completed · Skipped**.

Each activity has:

| Field | Meaning |
|---|---|
| **Title & type** | Studying, Class, Rest, Sport, Work, Meal, Sleep, Commute or One-time Event |
| **Subject / topic** | For study sessions and classes: link it to a subject, and optionally a specific topic |
| **Date, time, duration** | When it happens and for how long |
| **Recurring** | Repeat **daily** or **weekly** on chosen days, optionally until an end date |
| **Negotiable** | Can it be moved if the day is too full? (Gym: yes. Lecture: no.) |
| **Priority** | 1–5 |
| **Status** | Scheduled → Done / Partially Done / Skipped |
| **Notes** | Free text |

Labels in the list show at a glance which activities are **Auto-planned**, **Recurring** or **Non-negotiable**.

> 💡 **Tip:** When you mark a study session as **Done**, the linked topic counts as reviewed and its
> next review date is updated. The plan then adjusts automatically.

### 📈 Analytics

Your personal progress report:

- **Completion rate**: how many activities you actually finished
- **Average study session** length
- **Topics mastered**: green topics out of all topics
- 📊 **Weekly activity**: study hours against rest and sport hours for each day of the week
- 🥧 **Study time by subject** and **knowledge distribution** charts
- 💬 **Insights & recommendations**, for example *"Low completion rate: review whether your schedule is realistic"* or *"Long study sessions: shorter sessions with breaks help retention"*

### 👤 Profile Settings

Open it from your name in the top-right corner. Here you can:

- change your **name** and **date of birth**
- switch **data sharing** with teachers on or off. Turning it off removes your data from teacher statistics **immediately**.
- change your **password** (you enter the current one; other devices are signed out)
- **delete your account** with all its data. This asks for your password and cannot be undone.

Forgot your password? On the sign-in screen choose **Forgot password?**, enter your email address and follow the
link in the mail. The link works once and is valid for one hour.

---

## 🧠 How the smart planner works

When you press **Plan Sessions**, the app looks at your subjects, your topics and your timetable, and
places study sessions into your free time. The rules in plain words:

### 🕐 When sessions are placed

- ⏰ Only between **08:00 and 22:00**, in your own time zone
- 🚫 Never on top of anything already in your calendar (classes, meals, sleep…)
- ☕ At least **15 minutes** between two study sessions
- 🛑 At most **6 hours of study per day**, including study you scheduled yourself
- 📅 Only **before the exam**: nothing on or after the exam day

### 📏 How many and how long

| Mode | Sessions per day | | Strategy | Session length |
|---|:---:|---|---|:---:|
| 🌿 Relaxed | 1 | | 🚦 Traffic Light | 60 min |
| 🎯 Determined | 2 | | 🔁 Active Recall | 30 min |
| 🚨 Emergency | 3 | | 🖐️ Manual | *not planned* |

The most urgent subjects go first (Emergency mode, then the nearest exam, then the highest priority),
but **every subject gets its first session of the day before any subject gets a second one**.

### 🎯 Which topic each session covers

<table>
<tr>
<th width="50%">🚦 Traffic Light</th>
<th width="50%">🔁 Active Recall</th>
</tr>
<tr>
<td valign="top">

Focuses on weak topics without forgetting the strong ones.

🔴 red topics come up about **3× as often** as 🟢 green ones, and 🟡 yellow ones about twice as often.
The longer a topic hasn't been touched, the sooner it comes back.

</td>
<td valign="top">

Classic **spaced repetition**. A topic is reviewed again after:

**1 → 3 → 7 → 14 → 30 days**

🟢 rating it green moves it to the next step
🟡 yellow keeps the same step
🔴 red starts again from 1 day

</td>
</tr>
</table>

### 🔄 The plan keeps itself up to date

Once you have a plan, it **re-plans automatically** when you rate a topic or mark a session as done,
skipped and so on. If you move or edit a planned session yourself, it becomes *your* activity and the
planner works around it.

### 🔔 Overload warnings

The planner checks each upcoming day and warns you when:

| Warning | Severity |
|---|:---:|
| More than **10 hours** committed in a day (sleep, meals and rest not counted) | 🔴 High |
| More than **8 hours** committed in a day | 🟠 Medium |
| Not all wanted sessions of a subject fit (exam within 7 days) | 🔴 High |
| Not all wanted sessions of a subject fit (exam further away) | 🟠 Medium |
| Exam within **3 days** but the subject isn't in Emergency mode | 🟠 Medium |
| Exam within **7 days** and the subject is still in Relaxed mode | 🔵 Low |
| An Active Recall subject has no topics yet | 🔵 Low |

Each warning comes with suggestions, such as *move a negotiable activity*, *raise the subject's mode*,
*mark topics you know as green* or *add topics*.

---

## 👩‍🏫 For teachers: Class Overview

Teachers see a **Teacher Dashboard** built only from anonymous, combined data:

- 🔢 **Total students**, **average completion rate**, **students at risk**, **active subjects**
- 📈 **Class engagement trends**: average study hours and completion rate per week, for the last 5 weeks
- 📊 **Subject performance**: average knowledge per subject and how many students are struggling
- 💬 **Insights & recommendations**, for example *"Biochemistry needs attention: average knowledge is 38 %…"*,
  *"Completion rate has increased by 6 percentage points…"*

**How the numbers are worked out:**

| Measure | Meaning |
|---|---|
| Completion rate | Past activities done (partially done counts as half) |
| Knowledge | 🟢 = 100 %, 🟡 = 50 %, 🔴 = 0 %, averaged over topics |
| Student at risk | Completion below **60 %**, or more than half of their topics are 🔴 red |

> 🔒 **Privacy safeguard:** Only students who **opted in** are counted. If fewer than **5** such students
> exist, the dashboard shows *"Not enough data yet"*. Subjects studied by fewer than 5 of them are left out.
> A teacher can never see an individual student.

---

## 🛠️ For administrators: Users

Admins get an extra **Users** page with every account (name, email, role). From a dropdown next to each
user, an admin can make them a **Student**, **Teacher** or **Admin**.

- An admin cannot change their own role, so the system can't be left without an admin by accident.
- A role change takes effect within about 15 minutes, the next time the user's session renews. Signing out and back in applies it straight away.

---

## 🔒 Privacy & security

| | |
|---|---|
| 🔐 **Private by default** | Each student's subjects, topics and activities are visible **only to that student**. Not to other students, and not to teachers. |
| 🕶️ **Anonymous statistics** | Teachers see group totals only, from students who opted in, and only for groups of at least 5. |
| ✋ **Consent you control** | Data sharing can be switched on or off at any time in Profile Settings, with immediate effect. |
| 🔑 **Safe passwords** | Passwords are never stored as text, only as a secure one-way hash. |
| 🛡️ **Protected sign-in** | Repeated login attempts are limited (5 per minute), which blocks password-guessing. |
| ⏱️ **Secure sessions** | Sign-in sessions use short-lived keys that renew automatically. Signing out ends the session on the server too. |

---

## ☁️ Hosting, updates & backups

| | |
|---|---|
| 🖥️ **Where it runs** | On our own server, published to the internet through ngrok at the address above. |
| 🚀 **Updates** | Every approved change is **deployed automatically**. No manual steps, and the app checks it started correctly. |
| 💾 **Backups** | Before every update the database is **backed up automatically**. The last 14 backups are kept. |
| ↩️ **Rollback** | If an update causes a problem, we can return to an earlier version and restore its data. |
| ✅ **Quality checks** | Every change is tested automatically before it goes live: over 100 screen tests, about 20 end-to-end browser tests, and tests of the planner and the server. |

---

## 🧭 Known limitations & ideas for later

We'd rather you hear these from us:

- 🔁 **Status on repeating activities** applies to the whole series. Marking one Monday's gym session as
  *done* marks the whole weekly series. Per-day tracking is a planned improvement.
- 🏫 **Teacher statistics cover all opted-in students** together. Separate classes or groups per teacher
  could be added.
- 💻 **Designed for desktop and laptop screens.** It works in a mobile browser, but the layout is not yet
  optimised for phones.
- 🌐 **The ngrok address** is fine for a demo and for testing. For long-term use we recommend a custom
  domain (e.g. `medstudy.yourdomain.com`).

---

## 📖 Glossary

| Term | Meaning |
|---|---|
| **Activity** | Anything on your timetable: a class, a meal, sleep, a study session… |
| **Auto-planned** | A study session the planner created for you |
| **Negotiable** | An activity that can be moved when a day is too full |
| **Mode** | How urgent a subject is: Relaxed, Determined or Emergency |
| **Strategy** | How the planner picks topics: Manual, Traffic Light or Active Recall |
| **Traffic light** | Rating a topic 🟢 well known, 🟡 partially known or 🔴 needs work |
| **Spaced repetition** | Reviewing a topic at growing intervals (1, 3, 7, 14, 30 days) to remember it long-term |
| **Re-plan** | Throw away the future planned sessions that haven't started and plan again from now |

---

<div align="center">

**MedStudy Planner** · Diploma project · 2026

*Questions or feedback? Get in touch with us anytime.* 💬

</div>
