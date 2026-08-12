## Purpose

Provides a health check HTTP endpoint that external monitors, load balancers, and orchestrators can query to verify the service is running and responsive.

## ADDED Requirements

### Requirement: Health endpoint returns 200 with status ok
The system SHALL respond to GET /health with HTTP status code 200 and a JSON body containing `"status": "ok"`.

#### Scenario: Successful health check request
- **WHEN** client sends GET /health
- **THEN** response status is 200
- **AND** response body contains `{"status":"ok","timestamp":"..."}`
- **AND** Content-Type header is `application/json`

### Requirement: Health endpoint includes current timestamp
The system SHALL include an ISO 8601 UTC timestamp in the response, generated at request time.

#### Scenario: Timestamp is valid ISO 8601
- **WHEN** client receives a health check response
- **THEN** the `timestamp` field matches ISO 8601 format (e.g., `2024-01-01T00:00:00.000Z`)

#### Scenario: Timestamp reflects current time
- **WHEN** client sends two GET /health requests 1 second apart
- **THEN** the timestamps differ by approximately 1 second