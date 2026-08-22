# Pipeline Ship: construcción → depuración/estilo → consolidación

Flujo de 3 fases para Cline + Qwen (mismo set de skills en `~/.qwen/skills`). Fuentes de verdad: **OpenSpec** (qué y porqué) → **RAG** (este repo) → **MemPalace** (transversal).

**Alcance**: cualquier sesión de desarrollo en este workspace. La Fase 2 (consolidación) es un **gate obligatorio** antes de ship/handoff: se dispara con `/ship` o con cualquier petición de "entregar / ship / cerrar" con cambios de código pendientes.

## Fase 0 · Construcción (Cline + Qwen)

1. **OpenSpec primero**: trabajar sobre el change activo (`/opsx-apply <change>`). Las decisiones de diseño van a OpenSpec, nunca a texto suelto.
2. **RAG** (`npm run rag:query -- "<términos>"`) para "¿dónde está X?", convenciones y soluciones previas del repo. Citas con `path:line` verificable.
3. **MemPalace** solo para contexto que NO está en el repo (otras sesiones, aprendizajes transversales): `mempalace_status` → `mempalace_search` → KG.
4. El código sigue las convenciones del repo; si es UI, `PRODUCT.md` / `DESIGN.md` son la fuente de verdad visual.

## Fase 1 · Depuración y estilo (se dispara por condición, no por orden)

- Test roto, bug, comportamiento inexplicado → invocar skill `systematic-debugging` **antes** de tocar código "para corregir".
- Nuevos nombres públicos (API, módulo, flag, variable, doc) → `naming-analyzer`.
- Cambio de UI/branding → `impeccable`: `/impeccable audit` antes de empaquetar; check duro `npx impeccable@3.6.0 detect "<archivo>"` (errores del detector = fallo de validación).
- Credenciales/auth/entrada externa → `security-reviewer` durante el desarrollo (revisor continuo, **no** es el juez final).
- Páginas públicas/SEO → `seo-audit`.
- Arquitectura/SOLID, performance, error handling, boundary conditions → `code-review-expert` sobre el diff (revisor atómico, **no** emite el veredicto).

Los revisores de Fase 1 son **atómicos**: cada uno cubre un eje. Ninguno aprueba el conjunto.

## Fase 2 · Consolidación (gate obligatorio antes de ship)

Disparador: `/ship` (`.qwen/commands`, `.claude/commands`, `.cursor/commands`, `.opencode/commands`, `.continue/prompts`) o petición de "entregar / ship / cerrar".

Orden (sin saltarse pasos):

1. **superpowers-verification-before-completion**: build/tests reales en verde; registrar comandos + exit codes. Prohibido "debería pasar" sin ejecutar.
2. **Revisores atómicos sobre el diff** (`git diff HEAD`): `security-reviewer` (seguridad) + `code-review-expert` (SOLID / performance / error handling / boundary conditions). Producen **hallazgos por eje**; **no** emiten el veredicto de cierre.
3. **code-review-excellence** sobre el diff completo (`git diff HEAD`) como juez final neutral:
   - Fases: contexto → arquitectura/diseño → línea a línea.
   - Salida obligatoria: Summary / Strengths / Required Changes 🔴 / Suggestions 💡 / Questions ❓ / **Verdict**.
   - Enfoque: mantenibilidad integral, fit arquitectónico, coherencia de diseño — lo que los revisores atómicos pasan por alto.
   - Prohibido en esta fase: SAST/pen-testing (competencia de `security-reviewer`), bloquear por formato/lint, bloquear por estilo subjetivo.
4. **Gate**: cualquier 🔴 (de atómicos o del juez) → **no** handoff. Corregir y re-ejecutar `code-review-excellence` solo sobre el diff de correcciones. No existe la excepción "el cambio es pequeño".
5. **session-handoff** solo con veredicto ✅. Debe incluir: qué se construyó, change de OpenSpec asociado, veredicto de revisión, pendientes.
6. **Memoria**: `mempalace_diary_write` (AAAK) + `mempalace_kg_add` con punteros (sin duplicar contenido de OpenSpec, reglas ni SKILL.md).

## Anti-redundancia (reglas duras)

- ❌ No ejecutar `code-review-excellence` archivo a archivo durante el código: es el juez final del ciclo.
- ❌ No dejar que los revisores atómicos (seguridad, SEO, naming, code-review) emitan el veredicto de cierre: eso es de `code-review-excellence`.
- ❌ No saltarse la Fase 2 con la excusa "el cambio es pequeño": la única excepción es docs/config sin lógica de código (decirlo explícitamente en la respuesta).
- ❌ No copiar contenido de SKILL.md en reglas/memoria: solo punteros a la skill invocable.

## Comandos rápidos

```bash
npm test && npm run build    # paso 1 de Fase 2
git diff HEAD                # input único de revisión
/ship                        # Fase 2 desde cualquier agente
```
