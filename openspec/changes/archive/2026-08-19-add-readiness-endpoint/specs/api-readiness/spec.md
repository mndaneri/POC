# Delta Spec: api-readiness

## Purpose

Defines the readiness probe contract: a dependency-free endpoint that reports the process is operational, including uptime and memory footprint, so orchestrators and monitoring agents can make scheduling decisions without querying external systems.

## ADDED Requirements

### Requirement: Readiness probe endpoint
The service SHALL expose a `GET /ready` endpoint that responds with HTTP 200 and a JSON body while the process is running.

#### Scenario: Successful readiness check
- **WHEN** a client sends `GET /ready`
- **THEN** the response status code SHALL be 200
- **AND** the `Content-Type` header SHALL be `application/json`

### Requirement: Readiness response shape
The `GET /ready` response body SHALL be a JSON object containing exactly the fields `status` (string, value `"ready"`), `uptime_seconds` (number ≥ 0), and `memory_mb` (number ≥ 0).

#### Scenario: Response fields present with correct types
- **WHEN** a client sends `GET /ready` and parses the JSON body
- **THEN** the body SHALL contain `status` equal to `"ready"`
- **AND** `uptime_seconds` SHALL be a number with value ≥ 0
- **AND** `memory_mb` SHALL be a number with value ≥ 0

### Requirement: Readiness independence from external systems
The `GET /ready` handler SHALL NOT perform I/O to external systems (network, filesystem, or databases). It SHALL derive its values only from in-process state.

#### Scenario: Readiness responds without filesystem or network access
- **WHEN** the process cannot reach any external system
- **THEN** `GET /ready` SHALL still respond 200 with a valid body
