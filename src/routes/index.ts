import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido — Servidor API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 560px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    h1 { font-size: 2rem; margin-bottom: 8px; }
    .subtitle { color: #aaa; margin-bottom: 24px; font-size: 0.95rem; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(76,175,80,0.15);
      border: 1px solid #4caf50;
      border-radius: 24px;
      padding: 8px 20px;
      margin-bottom: 32px;
      font-weight: 600;
    }
    .dot {
      width: 12px; height: 12px;
      background: #4caf50;
      border-radius: 50%;
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(76,175,80,0.6); }
      50%       { transform: scale(1.3); box-shadow: 0 0 0 8px rgba(76,175,80,0); }
    }
    h2 { font-size: 1.1rem; margin-bottom: 12px; color: #90caf9; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    th { color: #aaa; font-weight: 500; font-size: 0.85rem; text-transform: uppercase; }
    td.method { font-family: monospace; color: #69f0ae; }
    td.path  { font-family: monospace; color: #ffab41; }
  </style>
</head>
<body>
  <div class="container">
    <h1>👋 Bienvenido</h1>
    <p class="subtitle">Servidor API en ejecución</p>

    <div class="status">
      <span class="dot"></span>
      Servicio activo
    </div>

    <h2>Endpoints disponibles</h2>
    <table>
      <thead><tr><th>Método</th><th>Ruta</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td class="method">GET</td><td class="path">/health</td><td>Estado del servidor (JSON)</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  res.type('html').send(html);
});

export default router;
