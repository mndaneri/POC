## Purpose

Provides clients a reliable way to verify which version of the API is running, enabling easier debugging and version compatibility checks.

## Requirements

### Requirement: Version endpoint returns application version
The system SHALL expose a `GET /version` endpoint that returns a JSON object containing the current application version read from `package.json`.

#### Scenario: Successful version query
- **WHEN** a client sends a `GET` request to `/version`
- **THEN** the system responds with HTTP 200 and a JSON body `{ "version": "<version-from-package.json>" }`

### Requirement: Version endpoint uses standard content type
The system SHALL respond with `Content-Type: application/json` on the version endpoint.

#### Scenario: Content type header present
- **WHEN** a client sends a `GET` request to `/version`
- **THEN** the response header includes `Content-Type: application/json`
