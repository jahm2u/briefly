Here’s the refined, crystal-clear requirements doc reflecting your clarifications:

⸻

🚀 Project Vision

A simplified, direct-to-Telegram productivity bot powered by GPT, integrating Todoist tasks and iCal calendar events. Sends concise, structured daily summaries via Telegram without altering original task texts, intelligently grouping tasks for clarity and immediate action.

⸻

✅ Core Integrations
	•	Todoist (Tasks & Inbox)
	•	Fetch tasks and inbox items daily.
	•	Provide direct clickable deeplinks to each Todoist task.
	•	iCal (Calendar)
	•	Pull daily calendar events (webcal/https URLs).
	•	Display calendar events only in the morning summary.
	•	Telegram
	•	Primary messaging interface.

⸻

📩 Scheduled Telegram Messages (3/day)

1️⃣ Morning Message (7 AM BRT)

Objective:
Deliver a clear daily summary combining today’s Todoist tasks and iCal events, explicitly highlighting new tasks since yesterday.

Message Content:
	•	Brief summary of today’s calendar events.
	•	Explicitly highlight new Todoist tasks compared to previous summaries.
	•	Logically group remaining tasks clearly, without modifying original text.
	•	Append Todoist clickable deeplink (“View Task”) after each task.

GPT Prompt Guidance:

“Review today’s Todoist tasks and today’s iCal calendar events. Compare with yesterday’s provided summary. Clearly identify and explicitly highlight tasks that are new since yesterday. Organize all tasks logically into meaningful groups without altering their original text. Include a brief summary of today’s calendar events at the beginning of your message. For every task listed, append a clickable Todoist deeplink labeled ‘View Task’.”

⸻

2️⃣ Afternoon Recap Message (Triggered Immediately After Final Meeting Ends)

Objective:
Recap today’s productivity, explicitly summarizing tasks completed since morning. Clearly highlight and logically group new inbox items and pending tasks, with a brief motivational acknowledgment (“reward”).

Message Content:
	•	List clearly tasks completed since the morning summary.
	•	Explicitly highlight new inbox tasks added since morning.
	•	Re-group remaining pending tasks logically (without changing original texts).
	•	Include a concise, motivational acknowledgment highlighting today’s progress as a “reward.”
	•	Append Todoist deeplinks (“View Task”) to each task.

GPT Prompt Guidance:

“Compare current Todoist tasks against today’s morning summary. Explicitly list tasks completed since the morning summary and include a short motivational acknowledgment highlighting today’s productivity as a reward. Clearly identify new inbox items added during the day (tasks without a project in Todoist) and logically group these inbox tasks. Logically re-group remaining pending tasks without changing their original text. For every task, include a clickable Todoist deeplink labeled ‘View Task’.”

⸻

3️⃣ Evening Triage Reminder (8 PM BRT)

Objective:
Send a concise reminder exclusively listing inbox tasks (tasks without a project in Todoist) needing triage/action before tomorrow.

Message Content:
	•	List only tasks in Todoist inbox clearly requiring triage.
	•	Group these inbox tasks logically without altering original text.
	•	Provide clickable Todoist deeplink (“View Task”) for immediate action.

GPT Prompt Guidance:

“Identify tasks currently in the Todoist inbox (tasks without an associated project) that require triage or action before tomorrow. Group these inbox tasks logically without modifying their original text. For each listed task, provide a clickable Todoist deeplink labeled ‘View Task’.”

⸻

🚫 Explicit Exclusions & Constraints:
	•	No UI, voice interactions, or touch inputs.
	•	No altering of original task texts.
	•	No Todoist labels, project tagging, free-time detection, or manual tagging.
	•	Calendar data displayed only in the morning message.
	•	Inbox defined explicitly as tasks without a project assigned in Todoist.

⸻

📌 Example Morning Message:

☀️ **Good morning! Here’s today's overview:**

📅 **Calendar Events:**
- 09:00–09:30 | Team Daily Standup
- 14:00–15:00 | Strategic Roadmap Discussion

✨ **New Tasks (since yesterday):**
- Review updated pricing strategy proposal [View Task]

🗂 **Grouped Tasks:**
**Product:**
- Evaluate latest UX feedback from users [View Task]

**Operational:**
- Follow up on billing discrepancy issue [View Task]


