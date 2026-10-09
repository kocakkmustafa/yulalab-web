'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { existsSync } = require('node:fs');

module.exports = {
  onPostBuild({ constants, utils }) {
    const root = path.resolve(__dirname, '../../..');
    const outputs = {};
    for (const field of ['FUNCTIONS_DIST', 'EDGE_FUNCTIONS_DIST']) {
      if (typeof constants[field] !== 'string' || constants[field].length === 0 ||
          constants[field].split(/[\\/]/).includes('..')) {
        utils.build.failBuild('Artifact proof requires a safe provider output directory: ' + field);
        return;
      }
      // Netlify normalizes paths inside the checkout to relative constants.
      // External Buildbot Functions directories stay absolute.
      outputs[field] = path.resolve(root, constants[field]);
    }
    // Netlify core has packaged the server and middleware at this event.
    // The managed Next adapter may run before local plugins and swap .next
    // with .netlify/static. Accept only one complete known artifact layout.
    const layouts = [
      { build: '.next', static: '.netlify/static', renderCwd: root, swapped: false },
      { build: '.netlify/.next', static: '.next', renderCwd: path.join(root, '.netlify'), swapped: true },
    ].filter(layout => ['BUILD_ID', 'prerender-manifest.json'].every(file =>
      existsSync(path.join(root, layout.build, file))) &&
      existsSync(path.join(root, layout.static, 'portfolio-registry.json')));
    if (layouts.length !== 1) {
      utils.build.failBuild('Artifact proof requires exactly one complete adapter publish layout');
      return;
    }
    const layout = layouts[0];
    const commands = [
      ['node', [path.join(root, 'scripts/verify-render-mode.mjs')], layout.renderCwd],
      ['python3', ['-B', '-O', path.join(root, '.github/ci/netlify-contract.py'),
        '--functions-dist', outputs.FUNCTIONS_DIST,
        '--edge-functions-dist', outputs.EDGE_FUNCTIONS_DIST,
        ...(layout.swapped ? ['--publish-swapped'] : [])], root],
    ];
    for (const [command, args, cwd] of commands) {
      const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
      if (result.error || result.signal || result.status !== 0) {
        utils.build.failBuild('Netlify artifact proof failed: ' + command,
          result.error ? { error: result.error } : undefined);
        return;
      }
    }
  },
};
