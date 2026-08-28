import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { jwtVerifyMiddleware } from './gateway/jwt-verify.middleware';

// One route table entry per downstream service prefix. `public: true` skips
// the gateway's JWT check — only /auth needs that, since register/login/
// refresh happen before a client has a token (Auth still guards /auth/me
// itself). Every other prefix is verified here, once, before it ever
// reaches a microservice.
interface Route {
  path: string;
  target: string;
  public?: boolean;
}

async function bootstrap() {
  // bodyParser: false — http-proxy-middleware needs the raw, unconsumed
  // request stream to forward bodies correctly. Nest's default body parser
  // would read the stream first and leave nothing to pipe downstream.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const config = app.get(ConfigService);
  const jwtSecret = config.get<string>('JWT_ACCESS_SECRET');

  // credentials: true + a reflected/pinned origin (never '*') so the browser
  // will actually send/receive Auth's refresh-token cookie through this
  // proxy — the gateway is the only host the browser ever talks to.
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') || true,
    credentials: true,
    // Without this, the browser can't cache the preflight decision (Chrome's
    // default is ~5s), so nearly every authenticated request — anything
    // carrying the Authorization header — pays a full extra OPTIONS
    // round-trip first. 24h lets it cache for the whole session instead.
    maxAge: 86400,
  });

  // *_SERVICE_URL holds a bare host[:port] (e.g. "task-service:3004" locally,
  // or a generated "task-service-xxxx:3004" on Render's private network via
  // fromService — see render.yaml) rather than a full URL, since Render's
  // internal hostnames aren't known until the target service is created and
  // can't be hardcoded. The scheme is prepended here instead.
  const routes: Route[] = [
    { path: '/auth', target: `http://${config.get<string>('AUTH_SERVICE_URL')}`, public: true },
    { path: '/profiles', target: `http://${config.get<string>('USER_SERVICE_URL')}` },
    { path: '/teams', target: `http://${config.get<string>('USER_SERVICE_URL')}` },
    { path: '/projects', target: `http://${config.get<string>('PROJECT_SERVICE_URL')}` },
    { path: '/categories', target: `http://${config.get<string>('PROJECT_SERVICE_URL')}` },
    { path: '/tasks', target: `http://${config.get<string>('TASK_SERVICE_URL')}` },
    { path: '/notifications', target: `http://${config.get<string>('NOTIFICATION_SERVICE_URL')}` },
  ];

  for (const route of routes) {
    const proxy = createProxyMiddleware({ target: route.target, changeOrigin: true });
    if (route.public) {
      app.use(route.path, proxy);
    } else {
      app.use(route.path, jwtVerifyMiddleware(jwtSecret), proxy);
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway: HTTP on :${port}, proxying to ${routes.length} route prefixes`);
}
bootstrap();
