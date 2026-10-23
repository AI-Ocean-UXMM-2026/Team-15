# Browser verification

The prototype itself needs no packages. The test runner needs Node.js, Playwright, and Chromium.

For an isolated test-tool installation outside the checkout:

```sh
npm install --prefix /tmp/invento-test-tools playwright@1.62.1
NODE_PATH=/tmp/invento-test-tools/node_modules /tmp/invento-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/invento-test-tools/node_modules node tests/prototype.cjs
```

If Chromium is already installed, set `CHROMIUM_PATH` to its executable. `/usr/bin/chromium` is detected automatically. The cloud workspace already supplies Playwright 1.62.1 and Chromium; `node tests/prototype.cjs` is sufficient there.

The runner starts an HTTP server on a free local port and closes the browser/server on completion. Nonzero exit indicates failure. It checks user-visible interactions and persisted state, including that draft confirmation does not prematurely change stock. It generates screenshots from a fresh browser context.

Not covered by headless checks: real camera decoding, actual speech recognition/provider accuracy, TalkBack, real Android font scaling, production authentication/authorization, server concurrency or transaction durability. These remain release gates.
