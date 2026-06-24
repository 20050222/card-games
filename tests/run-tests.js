import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const testDir = path.dirname(new URL(import.meta.url).pathname);
const normalizedTestDir = process.platform === 'win32' && testDir.startsWith('/')
  ? testDir.slice(1)
  : testDir;

const testFiles = fs
  .readdirSync(normalizedTestDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let passed = 0;

for (const file of testFiles) {
  const fullPath = path.join(normalizedTestDir, file);
  try {
    const module = await import(pathToFileURL(fullPath).href);
    module.run();
    passed += 1;
    console.log(`PASS ${file}`);
  } catch (error) {
    console.error(`FAIL ${file}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  console.log(`${passed}/${testFiles.length} test files passed`);
}
