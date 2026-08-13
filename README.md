# TaskFlow — Auth Service

Authentication & authorization microservice (NestJS + PostgreSQL + JWT).

## Endpoints
- `POST /auth/register` — create account, returns token pair
- `POST /auth/login` — authenticate, returns token pair
- `POST /auth/refresh` — rotate tokens using a refresh token
- `POST /auth/logout` — revoke a refresh token
- `GET  /auth/me` — current user (requires Bearer access token)
- Swagger docs at `/docs`

## Run with Docker
    docker compose up --build

## Run locally
    cd services/auth-service
    npm install
    npm run start:dev
