# html-welcome-page Specification

## Purpose
Proporciona una página HTML de bienvenida en la ruta raíz `/` que informa al usuario sobre el estado del servicio y lista los endpoints disponibles.
## Requirements
### Requirement: Serve welcome page at root

El servidor SHALL responder a GET `/` con un documento HTML 200 OK.

#### Scenario: User visits root path
- **WHEN** el cliente realiza GET `/`
- **THEN** el servidor responde con estado HTTP 200 y Content-Type text/html

### Requirement: Display server status indicator

La página SHALL incluir un indicador visual del estado del servicio (activo).

#### Scenario: Status is visible on page
- **WHEN** el usuario carga la página en `/`
- **THEN** ve un indicador visual que muestra "Servicio activo"

### Requirement: List available endpoints

La página SHALL listar los endpoints disponibles con su método HTTP y ruta.

#### Scenario: Endpoints are listed
- **WHEN** el usuario carga la página en `/`
- **THEN** ve una lista que incluye al menos `GET /health`

### Requirement: Return valid HTML

El contenido SHALL ser un documento HTML válido con DOCTYPE, head y body.

#### Scenario: Valid HTML structure
- **WHEN** se recibe la respuesta de GET `/`
- **THEN** el contenido contiene `<!DOCTYPE html>`, `<head>` y `<body>`

### Requirement: Not interfere with existing routes

La adición de la ruta `/` SHALL NOT afectar el funcionamiento de rutas existentes como `/health`.

#### Scenario: Health endpoint still works
- **WHEN** el cliente realiza GET `/health`
- **THEN** recibe la respuesta JSON habitual `{"status":"ok","timestamp":"..."}` con estado 200

