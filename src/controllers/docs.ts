import type { Express } from 'express';
import { openApiPath } from './openapi.js';

/** Interactive Swagger UI for the OpenAPI document at `openApiPath`. */
export const docsPath = '/docs';

const swaggerUiVersion = '5.30.2';

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Synapse Order Router API</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(openApiPath)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
      });
    </script>
  </body>
</html>
`;

export function addDocs(app: Express): void {
  app.get(docsPath, (_request, response) => {
    response.type('html').send(page);
  });
}
