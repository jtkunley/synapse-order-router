import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Request, Response } from 'express';
import { openApiPath } from './openapi';

/** Interactive Swagger UI for the OpenAPI document at `openApiPath`. */
export const docsPath = '/docs';
export const docsCssPath = `${docsPath}/assets/swagger-ui.css`;
export const docsBundlePath = `${docsPath}/assets/swagger-ui-bundle.js`;

const require = createRequire(import.meta.url);
const swaggerUiRoot = dirname(require.resolve('swagger-ui-dist/package.json'));
const assetOptions = { immutable: true, maxAge: '1y' };

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Synapse Order Router API</title>
    <link rel="stylesheet" href="${docsCssPath}" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${docsBundlePath}"></script>
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

export function handleDocs(_request: Request, response: Response): void {
  response.type('html').send(page);
}

export function handleDocsCss(_request: Request, response: Response): void {
  response.sendFile(join(swaggerUiRoot, 'swagger-ui.css'), assetOptions);
}

export function handleDocsBundle(_request: Request, response: Response): void {
  response.sendFile(join(swaggerUiRoot, 'swagger-ui-bundle.js'), assetOptions);
}
