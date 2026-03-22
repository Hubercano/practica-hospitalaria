# Guía Git y convenciones de commits

## Ramas principales
- `main` - rama de producción (siempre estable)
- `develop` - rama de desarrollo (integración de features)

Feature branches: `feat/<descripción>`
Fix branches: `fix/<descripción>`

## Convenciones de commits
- `feat: descripción breve` - nueva funcionalidad
- `fix: descripción breve` - corrección de bug
- `refactor: descripción breve` - cambios de código sin nueva funcionalidad
- `chore: descripción` - tareas de mantenimiento

## Buenas prácticas
- Un cambio por commit cuando tenga sentido (pequeños y atómicos).
- Mensajes en inglés o español según equipo, mantener consistencia.
- Abrir PRs desde branches pequeños con descripción y checklist.
