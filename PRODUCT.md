# PRODUCT

## Qué es
`prueba1` es un laboratorio personal para construir y validar herramientas de agentes de IA: RAG local (BM25, cero dependencias), generadores de documentos (SDDs y tutoriales en docx), un escáner de seguridad de skills (skillspector) y las capas de flujo que los orquestan (OpenSpec, skills de Cline, Open Design, MemPalace).

## Para quién
mndan. Sin usuarios externos. Toda decisión optimiza para velocidad y precisión en uso individual.

## Qué NO es
- No es un producto que se publique, ni una API pública, ni contenido de marketing.
- No necesita "efecto wow": pero SÍ necesita claridad y consistencia, porque yo mismo leo, mantengo y me apoyo en esta herramienta a diario.
- No es un juguete: la fiabilidad (determinismo, local-first) pesa tanto como la velocidad de iteración.

## Prioridades (en orden)
1. **Local-first**: todo funciona sin nube (Ollama local, RAG sin dependencias, MCP locales).
2. **Determinismo**: índices, builds y salidas reproducibles.
3. **Cero dependencias innecesarias**.
4. **Velocidad de iteración**: `tsx`/`ts-node`, sin build step para experimentos.

## Voz
Técnica, directa, en español. Sin hype, sin adjetivos que no aporten información. Si algo se explica con código o una cita verificable (`path:line`), no se explica con prosa.
