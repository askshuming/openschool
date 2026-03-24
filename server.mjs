import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeEnv } from './src/config/env.mjs';
import { DEFAULT_PORT } from './src/config/constants.mjs';
import { createAppServer } from './src/server/create-app-server.mjs';
import { buildCourseBlueprint } from './src/domain/course/blueprint.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

initializeEnv(__dirname);

const server = createAppServer({ publicDir });

if (path.resolve(process.argv[1] || '') === __filename) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  server.listen(port, () => {
    console.log(`LessonForge Family MVP running at http://localhost:${port}`);
  });
}

export { server, buildCourseBlueprint };
