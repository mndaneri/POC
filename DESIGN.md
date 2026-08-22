# DESIGN

## Alcance
- **Páginas HTML** (specs, welcome pages, reportes): artefactos single-file o estáticos, vistos en navegador.
- **Documentos docx** generados (SDDs, tutoriales): tipografía y estructura.
- **Salidas CLI**: formateadas como datos, no como decoración.

## Dirección
Herramienta de desarrollo funcional: limpia, densa, legible. La estética sirve a la lectura, no al marketing.

## Tipografía
- **Web**: system font stack para texto de interfaz; monoespaciada (`ui-monospace, SFMono-Regular, Consolas, monospace`) para código, rutas y comandos.
- **docx**: respetar la plantilla existente del generador (body ~Calibri 11, títulos por escalas de peso, código Consolas ~9.5 sobre fondo claro). No inventar plantillas nuevas sin decisión explícita aquí.
- La jerarquía se resuelve con escala y peso, no con color.

## Color
- Paleta neutra dominante; **un solo acento** para elementos interactivos o información clave.
- Rojo = fallo/peligro, verde = éxito: solo semánticos, nunca decorativos.

## Layout
- Ancho de lectura máximo ~88ch en documentos; tablas de 2–4 columnas en reportes.
- Separación de secciones con espacio, no con líneas decorativas.
- Contenido primero: la cabecera nombra el documento, no vende.

## Reglas
- Cuando el brief pida una superficie **explícitamente bold/marketing** (página pública, landing), la regla `open-design` aplica: usar el design system activo (hoy `default` = Neutral Modern) y anotar la elección.
- ❌ Patrones hero + CTA de marketing en páginas internas.
- ❌ Gradientes, glassmorphism, sombras decorativas.
- ❌ Voz visual de web en docx (o viceversa).
- ❌ Inventar paletas o tipografías que contradigan este archivo.
