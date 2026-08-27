# TaskFlow — Frontend

Angular client for TaskFlow, a collaborative task-management platform built on
a NestJS microservices backend (see `../services`). Talks to the backend
exclusively through the API Gateway — no service is ever addressed directly.

## Stack

- Angular 19, standalone components, signals + RxJS (no NgRx)
- Angular Material 3 (custom violet/orange theme, light/dark/system) + CDK (drag-drop, layout)
- TypeScript strict mode, strict Angular templates
- Lazy-loaded feature routes, functional guards/interceptors

## Prerequisites

- Node.js 20+
- The backend running (from the repo root): `docker compose up --build`
  — this brings up the gateway on `:3000` plus all five services, Kafka,
  Redis and Postgres. The frontend won't have anything to talk to without it.

## Setup

```bash
npm install
```

## Run (development)

```bash
npm start          # ng serve — http://localhost:4200
```

The dev build points at `http://localhost:3000` (the gateway's local
docker-compose port) via `src/environments/environment.development.ts`.
Change that file if your gateway runs somewhere else.

## Build

```bash
npm run build       # production build → dist/frontend
npm run watch        # development build, rebuilds on change
```

## Tests

```bash
npm test            # Karma/Jasmine unit tests
```

## Project structure

```
src/app/
  core/            # singletons: typed API services, interceptors, guards, models
  shared/ui/       # reusable presentational components (avatar, chips, skeletons, dialogs…)
  shared/constants/ shared/utils/   # status/priority metadata, date formatting
  layout/shell/    # app shell — sidenav, topbar, notification bell, account menu
  features/        # one folder per routed feature (auth, dashboard, projects, tasks, teams, profile)
```

Every HTTP call goes through a typed service in `core/services/` — there are
no raw `HttpClient` calls in components. `core/interceptors/auth.interceptor.ts`
attaches the access token and silently refreshes it on a 401;
`error.interceptor.ts` surfaces failures as toasts. The refresh token itself
is an httpOnly cookie set by auth-service — the frontend never stores it.

## Notes for reviewers

- `environment.ts` / `environment.development.ts` hold the single API
  gateway base URL (`apiUrl`) — there is no other place a backend host is
  configured.
- The Kanban board drives its four columns off `Task.status` (not
  project-service's separate, per-project `BoardColumn`/`columnId`), since
  the brief's "columns by task status" maps directly onto that fixed enum.
- Notifications are polled (`core/services/notifications-feed.service.ts`)
  since the backend has no push channel yet; that's the one place a future
  WebSocket/SSE swap would land, with no changes needed anywhere else.
- Creating a category is admin-only on the backend and there's no seed data
  or other admin UI for it, so the project form has a small inline
  "+ new category" affordance visible only to admins — otherwise that
  dropdown would stay empty forever for everyone.
