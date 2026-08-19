## Context

El servidor Express ya existe en `src/server.ts` y registra rutas mediante routers importados desde `src/routes/`. Solo tiene `/health`. No hay página en `/`.

See proposal.md - Why para la motivación.

## Goals / Non-Goals

**Goals:**
- Servir una página HTML estilizada en `/` sin dependencias adicionales
- Seguir el patrón router existente (un archivo por ruta)
- Mantener independencia entre rutas (no afectar `/health`)

**Non-Goals:**
- No se implementa un sistema de plantillas (ejs, pug, etc.) — el HTML es inline
- No se añade autenticación ni caching
- No se crea una interfaz completa de documentación (eso sería Swagger/Redoc)

## Decisions

| Decisión | Alternativa | Rationale |
|---|---|---|
| HTML inline en `res.send()` | Archivo estático con `res.sendFile()` o template engine | Cero dependencias nuevas, fácil de modificar, no requiere carpeta pública |
| Router separado `index.ts` | Ruta directa en `server.ts` | Consistencia con el patrón existente (`health.ts`) |
| CSS inline `<style>` | Archivo CSS externo + `express.static()` | Simple para una sola página; evita añadir middleware statico por ahora |

## Risks / Trade-offs

- [HTML inline puede volverse difícil de mantener si la página crece] → Mitigación: se puede migrar a template engine en el futuro sin cambiar la firma del endpoint
- [No hay pruebas visuales/E2E para validar renderizado] → La verificación por ahora se limita a test HTTP (estado 200, contenido presente)

## Migration Plan

No aplica — cambio aditivo sin datos ni configuración. Se despliega directamente.

## Open Questions

_(Ninguno)_
