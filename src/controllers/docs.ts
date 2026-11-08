import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Express } from 'express';
import { openApiPath } from './openapi.js';

/** Interactive Swagger UI for the OpenAPI document at `openApiPath`. */
export const docsPath = '/docs';

const swaggerUiAssetPath = `${docsPath}/assets`;
const require = createRequire(import.meta.url);
const swaggerUiRoot = dirname(require.resolve('swagger-ui-dist/package.json'));

const assets = {
  css: {
    path: `${swaggerUiAssetPath}/swagger-ui.css`,
    file: join(swaggerUiRoot, 'swagger-ui.css'),
  },
  bundle: {
    path: `${swaggerUiAssetPath}/swagger-ui-bundle.js`,
    file: join(swaggerUiRoot, 'swagger-ui-bundle.js'),
  },
} as const;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Synapse Order Router API</title>
    <link rel="stylesheet" href="${assets.css.path}" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${assets.bundle.path}"></script>
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
  app.get(assets.css.path, (_request, response) => {
    response.sendFile(assets.css.file, { immutable: true, maxAge: '1y' });
  });
  app.get(assets.bundle.path, (_request, response) => {
    response.sendFile(assets.bundle.file, { immutable: true, maxAge: '1y' });
  });
  app.get(docsPath, (_request, response) => {
    response.type('html').send(page);
  });
}
