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
  assert(browserApp.includes('AudioContext'), 'browser bundle uses Web Audio for sound effects');
  assert(browserApp.includes('playSound'), 'browser bundle exposes sound playback helpers');
  assert(browserApp.includes('toggleSound'), 'browser bundle supports muting sound');
  assert(browserApp.includes('playSoundForPlay'), 'browser bundle maps legal plays to named voice-like sound effects');
  assert(browserApp.includes('bomb'), 'browser bundle includes bomb sound cues');
  assert(browserApp.includes('triple'), 'browser bundle includes triple sound cues');
  assert(browserApp.includes('\\u62a2\\u5730\\u4e3b'), 'browser bundle exposes rob landlord action text');
  assert(browserApp.includes('multiplier'), 'browser bundle tracks classic multiplier scoring');
  assert(browserApp.includes('roundScores'), 'browser bundle calculates round settlement scores');
  assert(browserApp.includes('totalScores'), 'browser bundle keeps cumulative match scores across rounds');
  assert(browserApp.includes('spring'), 'browser bundle supports spring and anti-spring');
  assert(browserApp.includes('lastAlarm'), 'browser bundle supports one-card/two-card alarms');
  assert(html.includes('soundToggleButton'), 'index exposes a sound toggle button');
}
