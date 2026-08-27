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
  });

  const routes: Route[] = [
    { path: '/auth', target: config.get<string>('AUTH_SERVICE_URL'), public: true },
    { path: '/profiles', target: config.get<string>('USER_SERVICE_URL') },
    { path: '/teams', target: config.get<string>('USER_SERVICE_URL') },
    { path: '/projects', target: config.get<string>('PROJECT_SERVICE_URL') },
    { path: '/categories', target: config.get<string>('PROJECT_SERVICE_URL') },
    { path: '/tasks', target: config.get<string>('TASK_SERVICE_URL') },
    { path: '/notifications', target: config.get<string>('NOTIFICATION_SERVICE_URL') },
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
