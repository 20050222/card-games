import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const testDir = path.dirname(fileURLToPath(import.meta.url));

const testFiles = fs
  .readdirSync(testDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let passed = 0;

for (const file of testFiles) {
  const fullPath = path.join(testDir, file);
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
