# TaskFlow — Postman Testing & Database Seeding Guide

For every endpoint below: create a request in Postman with the given **method + URL**,
open the **Body → raw → JSON** tab, and paste the JSON example. Everything goes through
the **API Gateway** on `http://localhost:3000`.

**Headers you need:**
- `Content-Type: application/json` on every request that has a body.
- `Authorization: Bearer <accessToken>` on every request **except** the 5 under
  `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`. Get the token from
  the response of `POST /auth/login` (or `/auth/register`) and reuse it everywhere else.

---

## 0. Prerequisites

1. Generate one JWT secret and put the **same value** in all six `.env` files
   (`auth-service`, `user-service`, `project-service`, `task-service`,
   `notification-service`, `api-gateway`):
   ```
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Copy each `.env.example` to `.env` in every `services/*` folder and fill in
   `JWT_ACCESS_SECRET`.
3. `docker-compose up --build` and wait for all health checks (Kafka takes ~30-60s).

| Service | Direct port | Notes |
|---|---|---|
| **API Gateway** | 3000 | use this as the base for everything below |
| auth-service | 3001 | direct access, bypasses gateway |
| user-service | 3002 | direct access, bypasses gateway |
| project-service | 3003 | direct access, bypasses gateway |
| task-service | 3004 | direct access, bypasses gateway |
| notification-service | 3005 | direct access, bypasses gateway |

### Things to know before testing
- Only `/auth/*` is public at the gateway — every other prefix requires a Bearer token.
- `POST /auth/register` ignores any `role` you send — every user ends up `role: "member"`.
- No service enforces ownership/role checks on profiles, teams, projects or tasks, so
  **one user's token works for every request below** except `/notifications`, which is
  always scoped to whoever the token belongs to.
- Profiles are **not** created by calling `POST /profiles` in the normal flow —
  registering a user fires a Kafka event that auto-creates their profile. You then
  `PATCH` it to fill in the extra fields. There's no field to assign a profile to a
  team — that isn't exposed by the API even though the database supports it.
- Notifications have no `POST` endpoint — they're created only as a side effect of
  Kafka events (user registration → `welcome`, task assignment/status change →
  `task_assigned`/`task_status_changed`).

---

## 1. AUTH SERVICE — seeds `auth_db.users`

### POST `localhost:3000/auth/register`
No auth header needed. Run this 5 times with each body below to create 5 users.

**Example 1 — Alice**
```json
{
  "email": "alice@taskflow.dev",
  "password": "TaskFlow123!",
  "fullName": "Alice Martin"
}
```

**Example 2 — Bob**
```json
{
  "email": "bob@taskflow.dev",
  "password": "TaskFlow123!",
  "fullName": "Bob Dupont"
}
```

**Example 3 — Carla**
```json
{
  "email": "carla@taskflow.dev",
  "password": "TaskFlow123!",
  "fullName": "Carla Nguyen"
}
```

**Example 4 — David**
```json
{
  "email": "david@taskflow.dev",
  "password": "TaskFlow123!",
  "fullName": "David Chen"
}
```

**Example 5 — Emma**
```json
{
  "email": "emma@taskflow.dev",
  "password": "TaskFlow123!",
  "fullName": "Emma Garcia"
}
```

Each response looks like:
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "b6f2...(96 hex chars)",
  "user": {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "email": "alice@taskflow.dev",
    "fullName": "Alice Martin",
    "role": "member"
  }
}
```
Save each `user.id` and `accessToken` somewhere (Postman environment variables, or a
scratch note) — you'll need them as `userId` / `Bearer` values in every section below.

### POST `localhost:3000/auth/login`
No auth header needed.
```json
{
  "email": "alice@taskflow.dev",
  "password": "TaskFlow123!"
}
```

### POST `localhost:3000/auth/refresh`
No auth header needed — the refresh token itself is the credential.
```json
{
  "refreshToken": "<paste the refreshToken from login/register here>"
}
```

### POST `localhost:3000/auth/logout`
No auth header needed.
```json
{
  "refreshToken": "<paste a refreshToken here>"
}
```

### GET `localhost:3000/auth/me`
Header: `Authorization: Bearer <accessToken>`. No body.

---

## 2. USER SERVICE — seeds `user_db.teams` (5) and `user_db.profiles` (5, auto-created)

All requests need `Authorization: Bearer <accessToken>`.

### POST `localhost:3000/teams`
Run 5 times.

**Example 1**
```json
{ "name": "Engineering", "description": "Builds and maintains the TaskFlow platform" }
```

**Example 2**
```json
{ "name": "Product", "description": "Owns roadmap and feature discovery" }
```

**Example 3**
```json
{ "name": "Design", "description": "UX/UI for all TaskFlow surfaces" }
```

**Example 4**
```json
{ "name": "Marketing", "description": "Growth and go-to-market" }
```

**Example 5**
```json
{ "name": "QA", "description": "Quality assurance and release testing" }
```

### GET `localhost:3000/teams`
No body.

### GET `localhost:3000/teams/:id`
No body. Replace `:id` with a team id from the list above.

### PATCH `localhost:3000/teams/:id`
```json
{ "name": "Engineering & Platform" }
```

### DELETE `localhost:3000/teams/:id`
No body.

---

### GET `localhost:3000/profiles`
No body. Confirms the 5 profiles that were auto-created when you registered the 5
users in section 1 (each has just `userId` + `fullName` set so far).

### PATCH `localhost:3000/profiles/:userId`
Replace `:userId` with each user's id from registration. Run 5 times, one per user.

**Example 1 — Alice's profile**
```json
{
  "jobTitle": "Backend Engineer",
  "bio": "Loves databases and clean APIs.",
  "avatarUrl": "https://i.pravatar.cc/150?u=alice"
}
```

**Example 2 — Bob's profile**
```json
{
  "jobTitle": "Frontend Engineer",
  "bio": "React all day, every day.",
  "avatarUrl": "https://i.pravatar.cc/150?u=bob"
}
```

**Example 3 — Carla's profile**
```json
{
  "jobTitle": "DevOps Engineer",
  "bio": "Automates everything twice.",
  "avatarUrl": "https://i.pravatar.cc/150?u=carla"
}
```

**Example 4 — David's profile**
```json
{
  "jobTitle": "QA Engineer",
  "bio": "Breaks things professionally.",
  "avatarUrl": "https://i.pravatar.cc/150?u=david"
}
```

**Example 5 — Emma's profile**
```json
{
  "jobTitle": "Product Manager",
  "bio": "Turns feedback into roadmaps.",
  "avatarUrl": "https://i.pravatar.cc/150?u=emma"
}
```

### GET `localhost:3000/profiles/me`
No body. Returns the profile of whoever the Bearer token belongs to.

### GET `localhost:3000/profiles/:userId`
No body.

### DELETE `localhost:3000/profiles/:userId`
No body.

### POST `localhost:3000/profiles`
Not needed in the normal flow (profiles auto-create on registration), but the endpoint
exists — useful if you want to manually create a profile for a `userId` that has no
profile yet:
```json
{
  "userId": "<a user id that has no profile yet>",
  "fullName": "Manual Test User",
  "jobTitle": "Contractor",
  "bio": "Added directly through POST /profiles.",
  "avatarUrl": "https://i.pravatar.cc/150?u=manual"
}
```

---

## 3. PROJECT SERVICE — seeds `project_db.categories` (5), `projects` (5), members, columns

All requests need `Authorization: Bearer <accessToken>`.

### POST `localhost:3000/categories`
Run 5 times.

**Example 1**
```json
{ "name": "Backend", "color": "#2563eb", "description": "Server-side and API work" }
```

**Example 2**
```json
{ "name": "Frontend", "color": "#16a34a", "description": "Client-side UI work" }
```

**Example 3**
```json
{ "name": "Infrastructure", "color": "#7c3aed", "description": "DevOps, CI/CD, cloud" }
```

**Example 4**
```json
{ "name": "Marketing Campaign", "color": "#f59e0b", "description": "Launch and growth campaigns" }
```

**Example 5**
```json
{ "name": "Research", "color": "#db2777", "description": "Exploratory / R&D work" }
```

### GET `localhost:3000/categories`
No body. Save each returned `id` — used as `categoryId` below.

### GET `localhost:3000/categories/:id` / PATCH / DELETE
No body for GET/DELETE.
```json
{ "description": "Updated description for this category" }
```

---

### POST `localhost:3000/projects`
Run 5 times. Replace `categoryId` with an id from the previous step (or omit the
field entirely — it's optional).

**Example 1**
```json
{
  "name": "TaskFlow Core API",
  "description": "The microservices backend itself",
  "categoryId": "<categoryId of Backend>",
  "deadline": "2026-12-31T00:00:00.000Z"
}
```

**Example 2**
```json
{
  "name": "Mobile App Redesign",
  "description": "New UI/UX for the mobile client",
  "categoryId": "<categoryId of Frontend>",
  "deadline": "2026-10-15T00:00:00.000Z"
}
```

**Example 3**
```json
{
  "name": "Cloud Migration",
  "description": "Move infra from bare metal to k8s",
  "categoryId": "<categoryId of Infrastructure>",
  "deadline": "2027-01-31T00:00:00.000Z"
}
```

**Example 4**
```json
{
  "name": "Q4 Product Launch",
  "description": "Marketing push for the Q4 release",
  "categoryId": "<categoryId of Marketing Campaign>",
  "deadline": "2026-11-01T00:00:00.000Z"
}
```

**Example 5**
```json
{
  "name": "AI Assistant POC",
  "description": "Proof of concept for an in-app AI helper",
  "categoryId": "<categoryId of Research>"
}
```

Each project auto-adds you as `owner` and auto-creates 3 board columns
(`To Do`, `In Progress`, `Done`). Save the first project's `id` as your working
`projectId` for section 4.

### GET `localhost:3000/projects`
No body — lists all projects you're a member of.

### GET `localhost:3000/projects/:id`
No body — returns the project with `category`, `members`, `columns` populated.

### PATCH `localhost:3000/projects/:id`
```json
{ "status": "active" }
```
(`status` enum: `planning`, `active`, `on_hold`, `completed`, `archived`)

### DELETE `localhost:3000/projects/:id`
No body.

---

### POST `localhost:3000/projects/:id/members`
Replace `:id` with the "TaskFlow Core API" project id. Run 4 times to add the other
4 users.

**Example 1 — Bob as admin**
```json
{ "userId": "<Bob's userId>", "role": "admin" }
```

**Example 2 — Carla as member**
```json
{ "userId": "<Carla's userId>", "role": "member" }
```

**Example 3 — David as member**
```json
{ "userId": "<David's userId>", "role": "member" }
```

**Example 4 — Emma as member**
```json
{ "userId": "<Emma's userId>", "role": "member" }
```

(`role` enum: `owner`, `admin`, `member`)

### GET `localhost:3000/projects/:id/members`
No body.

### PATCH `localhost:3000/projects/:id/members/:userId`
```json
{ "role": "owner" }
```

### DELETE `localhost:3000/projects/:id/members/:userId`
No body.

---

### GET `localhost:3000/projects/:id/columns`
No body. Save the `To Do` column's `id` — used as `columnId` in section 4.

### POST `localhost:3000/projects/:id/columns`
```json
{ "name": "Blocked", "position": 3 }
```

### PATCH `localhost:3000/projects/:id/columns/:columnId`
```json
{ "name": "Blocked / Waiting" }
```

### DELETE `localhost:3000/projects/:id/columns/:columnId`
No body.

---

## 4. TASK SERVICE — seeds `task_db.tasks` (5) + `subtasks`, `comments`, `task_history`

All requests need `Authorization: Bearer <accessToken>`. Use the "TaskFlow Core API"
`projectId` and its `To Do` `columnId` from section 3.

### POST `localhost:3000/tasks`
Run 5 times.

**Example 1**
```json
{
  "projectId": "<projectId>",
  "columnId": "<columnId of To Do>",
  "title": "Design database schema",
  "description": "Model users, projects, tasks and their relations",
  "priority": "high",
  "assigneeId": "<Alice's userId>",
  "deadline": "2026-09-01T00:00:00.000Z"
}
```

**Example 2**
```json
{
  "projectId": "<projectId>",
  "columnId": "<columnId of To Do>",
  "title": "Implement JWT auth flow",
  "description": "Access + refresh token issuance and rotation",
  "priority": "urgent",
  "assigneeId": "<Bob's userId>",
  "deadline": "2026-08-25T00:00:00.000Z"
}
```

**Example 3**
```json
{
  "projectId": "<projectId>",
  "columnId": "<columnId of To Do>",
  "title": "Set up CI/CD pipeline",
  "description": "Build, test and deploy on every push",
  "priority": "medium",
  "assigneeId": "<Carla's userId>",
  "deadline": "2026-09-10T00:00:00.000Z"
}
```

**Example 4**
```json
{
  "projectId": "<projectId>",
  "columnId": "<columnId of To Do>",
  "title": "Write integration tests",
  "description": "Cover auth, user, project and task flows end to end",
  "priority": "medium",
  "assigneeId": "<David's userId>",
  "deadline": "2026-09-20T00:00:00.000Z"
}
```

**Example 5**
```json
{
  "projectId": "<projectId>",
  "columnId": "<columnId of To Do>",
  "title": "Fix Redis cache invalidation bug",
  "description": "Stale project list served after member changes",
  "priority": "high",
  "assigneeId": "<Emma's userId>",
  "deadline": "2026-08-30T00:00:00.000Z"
}
```

(`priority` enum: `low`, `medium`, `high`, `urgent`)

Each of these publishes a `TaskCreated` Kafka event, which becomes a `task_assigned`
notification for the assignee — so this step alone seeds 5 rows in
`notification_db.notifications` too. Save the first task's `id` for the rest of this
section.

### GET `localhost:3000/tasks?projectId=<projectId>`
No body. Query param `projectId` is required.

### GET `localhost:3000/tasks/:id`
No body — returns the task with `subtasks`, `comments`, `history` populated.

### PATCH `localhost:3000/tasks/:id`
```json
{ "priority": "urgent", "description": "Updated description" }
```

### PATCH `localhost:3000/tasks/:id/status`
```json
{ "status": "in_progress" }
```
(`status` enum: `todo`, `in_progress`, `in_review`, `done`)

### PATCH `localhost:3000/tasks/:id/assign`
```json
{ "assigneeId": "<Carla's userId>" }
```

### GET `localhost:3000/tasks/:id/history`
No body.

### DELETE `localhost:3000/tasks/:id`
No body.

---

### POST `localhost:3000/tasks/:id/subtasks`
Run 5 times against the first task's id.

**Example 1**
```json
{ "title": "Draft ER diagram" }
```

**Example 2**
```json
{ "title": "Review with team" }
```

**Example 3**
```json
{ "title": "Write migration scripts" }
```

**Example 4**
```json
{ "title": "Add indexes for common queries" }
```

**Example 5**
```json
{ "title": "Document schema in README" }
```

### GET `localhost:3000/tasks/:id/subtasks`
No body.

### PATCH `localhost:3000/tasks/:id/subtasks/:subtaskId`
```json
{ "done": true }
```

### DELETE `localhost:3000/tasks/:id/subtasks/:subtaskId`
No body.

---

### POST `localhost:3000/tasks/:id/comments`
Run 5 times (ideally with a different user's token each time to spread out
`authorId` values).

**Example 1**
```json
{ "content": "Started sketching the schema, will share a diagram soon." }
```

**Example 2**
```json
{ "content": "Looks good, make sure refresh_tokens has an index on tokenHash." }
```

**Example 3**
```json
{ "content": "I will handle the migration scripts once the diagram is approved." }
```

**Example 4**
```json
{ "content": "Adding this to the integration test plan." }
```

**Example 5**
```json
{ "content": "Great progress, keep me posted for the launch timeline." }
```

### GET `localhost:3000/tasks/:id/comments`
No body.

---

## 5. NOTIFICATION SERVICE — reads `notification_db.notifications`

No `POST` endpoint exists — notifications are created only as a side effect of Kafka
events. By this point you should already have at least 10 rows: 5 `welcome`
notifications from section 1 registrations, and 5 `task_assigned` notifications from
section 4 task creation. Notifications are always scoped to the token's owner, so
switch the Bearer token to match the user you want to inspect (e.g. Bob's token to see
Bob's notifications).

### GET `localhost:3000/notifications`
No body.

### GET `localhost:3000/notifications/unread-count`
No body. Returns `{ "count": number }`.

### PATCH `localhost:3000/notifications/:id/read`
No body — `:id` is a notification id from the `GET /notifications` response.

### PATCH `localhost:3000/notifications/read-all`
No body.

### DELETE `localhost:3000/notifications/:id`
No body.

To generate more notifications for testing, reassign a task a few more times with
different `assigneeId` values via `PATCH /tasks/:id/assign` (section 4) — each
reassignment fires a new `TaskAssigned` event.

---

## 6. Enum cheat-sheet

| Field | Values |
|---|---|
| `User.role` | `admin`, `manager`, `member` (register always produces `member`) |
| `AddMemberDto.role` / `UpdateMemberDto.role` | `owner`, `admin`, `member` |
| `UpdateProjectDto.status` | `planning`, `active`, `on_hold`, `completed`, `archived` |
| `CreateTaskDto.priority` / `UpdateTaskDto.priority` | `low`, `medium`, `high`, `urgent` |
| `UpdateStatusDto.status` / `UpdateTaskDto.status` | `todo`, `in_progress`, `in_review`, `done` |
| `Notification.type` | `task_assigned`, `task_status_changed`, `task_deadline_reminder`, `welcome` |

---

## 7. Known quirks worth being aware of while testing

- **No role/ownership checks** on profiles, teams, projects, categories or tasks — any
  valid token can read/edit/delete any other user's resources in those services.
- **`Profile.teamId` isn't settable via the API** even though the entity/relation
  exists — no endpoint accepts it.
- **`register` ignores any `role` you send** — always ends up `member`.
- **`TaskStatusChanged` Kafka payload's `previousStatus` field actually holds the
  *new* status**, not the prior one (a pre-existing bug in `TasksService.publish`) —
  don't be surprised if the notification message and the "previous" status match.
- **Refresh tokens are returned only in the JSON body**, never as a cookie — you must
  carry them yourself between requests.
