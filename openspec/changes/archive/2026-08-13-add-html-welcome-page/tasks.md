## 1. Crear router de bienvenida

- [x] 1.1 Crear `src/routes/index.ts` con Router de Express
- [x] 1.2 Implementar GET `/` que responda HTML con DOCTYPE, head y body (req: Serve welcome page at root, Return valid HTML)
- [x] 1.3 Incluir indicador visual "Servicio activo" con CSS animado (req: Display server status indicator)
- [x] 1.4 Incluir lista de endpoints disponibles (`GET /health`) (req: List available endpoints)

## 2. Registrar router en servidor

- [x] 2.1 Importar `indexRouter` en `src/server.ts`
- [x] 2.2 Registrar con `app.use('/', indexRouter)` antes del health router

## 3. Verificar que rutas existentes no se ven afectadas

- [x] 3.1 Ejecutar GET `/health` y confirmar respuesta JSON `{status: "ok"}` (req: Not interfere with existing routes)

## 4. Ejecutar tests existentes

- [x] 4.1 Correr `npm test` y confirmar que todos los tests pasan sin fallos
