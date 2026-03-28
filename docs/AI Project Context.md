# AI Project Context

## 1. Descripción general del sistema
- Propósito: Plataforma para gestionar prácticas académicas en instituciones de salud (clínicas y hospitales). Centraliza la administración de instituciones, programas académicos, áreas de práctica (rotaciones), servicios clínicos, capacidad instalada, docentes y documentación institucional.
- Usuarios: InstitutionAdmin, Coordinator, Teacher, Student, Staff administrativo.
- Flujos clave: CRUD de entidades, asignación de rotaciones, gestión de capacidad, importación/exportación de plantillas (XLSX), control de permisos y reportes.

## 2. Arquitectura funcional del sistema
- Frontend: SPA en Angular 19 (componentes standalone, formularios reactivos, uso de Signals donde aplica) + Tailwind CSS.
- Backend: NestJS modular (módulos por dominio), controladores, servicios y DTOs con validación (`class-validator`). Persistencia con Prisma ORM sobre base de datos relacional (Postgres recomendado).
- API: REST JSON; endpoints especiales para `bulk-upload` (multipart/form-data) y descarga de plantillas (`xlsx`).
- Infraestructura: Docker Compose para desarrollo, migraciones con `prisma migrate`, CI/CD (GitHub Actions / Azure Pipelines).
- Seguridad: HTTPS, autenticación JWT/OAuth2 y autorización basada en roles.

## 3. Módulos existentes
- Instituciones: gestión de instituciones y sedes.
- Listado de Servicios Habilitados (`clinical-services`): CRUD, plantillas XLSX, carga masiva con resumen `{ total, success, failed, errors }`.
- Programas Académicos: CRUD y vinculación con áreas de práctica.
- Áreas de Práctica / Rotaciones: definición de rotaciones, duraciones, supervisores asignados.
- Capacidad Instalada (`service-capacity`): capacidades por servicio/sede (camas, consultorios, etc.).
- Docentes: gestión de docentes, asignaciones y supervisión de áreas.
- Documentos Institucionales: repositorio de documentos, versiones y permisos.
- Programación de Rotaciones (`rotation-schedules`): gestión de las programaciones/turnos de rotación que vinculan institución, programa, área, docentes y estudiantes. Incluye flujo de creación progresiva (modal), validaciones de capacidad y calendario.

## 4. Relaciones entre módulos
- Institution (1) → (N) Program
- Program (1) → (N) RotationArea
- RotationArea (N) ↔ (N) ClinicalService (una área puede usar varios servicios; un servicio puede usarse en varias áreas)
- ClinicalService (1) → (N) ServiceCapacity
- Program → Students (N)
- Teacher (1) → (N) RotationArea (supervisión)
- Institution (1) → (N) RotationSchedule
- Program (1) → (N) RotationSchedule
- RotationArea (1) → (N) RotationSchedule
- RotationSchedule (N) ↔ (N) Teacher
- RotationSchedule (N) ↔ (N) Student

Regla por defecto: `ClinicalService.code` es único por institución (configurable en reglas de negocio).

## 5. Modelo conceptual del sistema
- Institution: `id: UUID`, `name`, `taxId`, `addresses[]`, `createdAt`, `updatedAt`.
- Program: `id: UUID`, `institutionId`, `name`, `description`.
- RotationArea: `id`, `programId`, `name`, `durationWeeks`, `supervisorId`.
- ClinicalService: `id`, `code` (numero_distintivo), `name` (serv_nombre), `venueName` (sede_nombre), `venueSequence` (numero_sede), `venueCode` (codigo_habilitacion), `description`, `isActive`.
- ServiceCapacity: `id`, `serviceId`, `headquarters`, `capacityGroup`, `capacityQuantity`, `distinctiveCode`.
- Teacher / Student / Document: modelos con `id`, referencias, timestamps.
- RotationSchedule: `id`, `institutionId`, `programId`, `areaId`, `teacherIds[]`, `studentIds[]`, `startDate`, `endDate`, `createdAt`, `updatedAt`.

Notas: usar UUID para identificadores; `createdAt`/`updatedAt` en todas las entidades.

## 6. Tecnologías utilizadas
- Frontend: Angular 19, Tailwind CSS, RxJS, Formularios Reactivos, Signals (cuando aplica).
- Backend: NestJS (TypeScript), Prisma ORM, ExcelJS (XLSX), Multer (file uploads), Jest (tests).
- Infra & DevOps: Postgres (recomendado), Docker Compose, GitHub Actions o similar, monitoreo/logging (pino/winston), métricas (Prometheus), tracing (OpenTelemetry).

## 7. Convenciones de desarrollo
- Estructura backend: `backend/src/<module>/{<module>.controller.ts, <module>.service.ts, dto/*.ts}`.
- APIs: respuestas consistentes `{ data, meta?, errors? }`.
- DTOs: usar `class-validator` y `class-transformer`.
- Migraciones y seeds: `prisma/migrations`, `prisma/seed.ts`.
- IDs: UUID v4; `code` de negocio string con restricción de unicidad en DB.
- Bulk imports: idempotencia por defecto mediante `upsert` por `code`.

## 8. Reglas de negocio principales
- `ClinicalService.code` es único por institución y se usa para upsert/imports por defecto.
- Importaciones masivas: Requerir encabezados (`numero_distintivo`, `serv_nombre`) y devolver resumen con errores por fila.
- Capacidades: cantidades enteras >= 0, asociadas a `serviceId` y `headquarters`.

## 9. Principios de UX del sistema
- Claridad: mensajes claros, confirmaciones para acciones destructivas.
- Feedback inmediato: toasts y detalles para errores (especialmente en importes masivos).
- Preview: mostrar vista previa de filas problemáticas antes de persistir.

## 10. Estructura recomendada para prompts futuros
Use la plantilla incluida en el archivo original para solicitudes a la IA.

## 11. Design System
Resumen y tokens recomendados. Extraer paleta desde `diseño-vistas.png` y similares.
