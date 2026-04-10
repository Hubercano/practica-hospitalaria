## Backend

API NestJS para la plataforma de práctica hospitalaria.

## Seguridad y Auth

El backend ahora incluye:

- Login con email y contraseña
- Access token JWT de corta duración
- Refresh token en cookie `HttpOnly`
- Roles iniciales `HOSPITAL` e `INSTITUCION`
- Guards globales para proteger toda la API privada
- Endpoints públicos explícitos para inducciones y encuestas

## Variables de entorno

Usa [backend/.env.example](.env.example) como referencia. Las variables mínimas para levantar auth en local son:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:4200
AUTH_JWT_SECRET=change_this_enterprise_jwt_secret
AUTH_JWT_ISSUER=practica-hospitalaria-backend
AUTH_JWT_AUDIENCE=practica-hospitalaria-frontend
AUTH_ACCESS_TOKEN_TTL=15m
AUTH_REFRESH_TOKEN_TTL_MS=604800000
BOOTSTRAP_ADMIN_EMAIL=admin@hospital.local
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!
```

Compatibilidad:

- Si aún existe `JWT_SECRET`, el backend la acepta como fallback.

## Primer arranque

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

En Windows, `start:dev` usa `nodemon` + `ts-node` para evitar la inestabilidad del watcher de Nest al reiniciar procesos.

Si no existe ningún usuario con rol `HOSPITAL`, al arrancar la aplicación se crea automáticamente el usuario bootstrap definido por `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`.

## Credenciales iniciales de desarrollo

Configura las credenciales bootstrap en tu `.env` local. Luego inicia sesión desde el frontend con ese email y contraseña.

## Endpoints de autenticación

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

## Notas operativas

- El refresh token se envía en cookie y requiere `withCredentials` en el frontend.
- `FRONTEND_ORIGIN` debe coincidir con el origen real del cliente Angular.
- En producción cambia todos los secretos y credenciales bootstrap.
