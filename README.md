# Practicas Hospitalarias

Proyecto para gestionar prácticas académicas en instituciones de salud (clínicas y hospitales). Frontend en Angular 19 y backend en NestJS con Prisma.

## Estructura

- `/frontend` - Aplicación Angular (SPA)
- `/backend` - API NestJS + Prisma
- `/docs` - Documentación del proyecto

## Tecnologías

- Frontend: Angular 19, Tailwind CSS, RxJS
- Backend: NestJS, Prisma, PostgreSQL
- Infra: Docker Compose (archivo `docker-compose.yml`)

## Requisitos

- Node.js v18+ / npm
- Docker (opcional para DB en desarrollo)

## Ejecutar en desarrollo

Frontend (desde la raíz):

```bash
cd frontend
npm install
npm run dev
```

Backend (desde la raíz):

```bash
cd backend
npm install
npm run start:dev
```

## Variables de entorno

- `backend/.env` debe contener `DATABASE_URL` y otras variables (ver `backend/.env.example`).

## Git

- Ramas principales: `main` (producción), `develop` (desarrollo)
- Convenciones: usar prefijos `feat:`, `fix:`, `refactor:`, etc.

Más documentación en `/docs`.
