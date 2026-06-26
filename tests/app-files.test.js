import assert from 'assert';
import fs from 'fs';

export function run() {
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('&#26007;&#22320;&#20027;'), 'index contains game title');
  assert(html.includes('src/browser-app.js'), 'index loads direct-open browser bundle');
  assert(!html.includes('type="module"'), 'index does not require browser module loading');

  const css = fs.readFileSync('styles.css', 'utf8');
  assert(css.includes('.card-table'), 'styles include card table');
  assert(css.includes('.playing-card'), 'styles include playing cards');

  const ui = fs.readFileSync('src/ui.js', 'utf8');
  assert(ui.includes('renderGame'), 'ui exports renderGame');

  const browserApp = fs.readFileSync('src/browser-app.js', 'utf8');
  assert(browserApp.includes('startGame'), 'browser bundle starts the game');
}
