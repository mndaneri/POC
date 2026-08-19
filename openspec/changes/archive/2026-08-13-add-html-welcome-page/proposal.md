## Why

Al visitar la raíz (`/`) del servidor, el usuario ve "Cannot GET /" porque no existe una ruta principal. Se necesita una página de bienvenida HTML que informe al usuario que el servicio está activo y muestre los endpoints disponibles.

## What Changes

- Crear `src/routes/index.ts` con un endpoint GET `/` que sirva una página HTML estilizada
- Registrar el nuevo router en `src/server.ts` antes del router de health
- La página mostrará: título, estado del servicio (con indicador animado), y lista de endpoints

## Capabilities

### New Capabilities

- `html-welcome-page`: Página HTML servida en la ruta raíz `/` que muestra información del servidor y endpoints disponibles

### Modified Capabilities

_(Ninguno — no se modifican comportamientos existentes)_

## Impact

- **Código nuevo**: `src/routes/index.ts`, delta spec en `specs/html-welcome-page/spec.md`
- **Código modificado**: `src/server.ts` (agregar import y registro del router)
- **Sin dependencias nuevas** — solo Express ya existente
- **Sin cambios breaking** — la ruta `/health` no se modifica
