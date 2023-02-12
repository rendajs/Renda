# Testing

There are two test suites: `e2e` and `unit`. These are not 'end to end' and 'unit' tests in the strict sense in that unit tests only test for very small isolated functions and that e2e tests are testing a full flow with the entire editor. But rather, the unit tests are fast and the e2e tests require puppeteer in order to run, making them slower and more flaky.

To run tests you can run `deno task test` or `./scripts/test.js`. You can optionally provide a path to only run a specific portion of the test suite. `./scripts/test.js test/unit` only runs the unit test suite for example.

The test script takes some optional parameters:

- `--coverage` generates a coverage file in `.lcov` format. This is useful if your editor supports it.
- `--html` generates a coverage file in `.html` format. `genhtml` needs to be installed for this to work. The generated html can be found at `.coverage/html`.
- `--no-headless` to disable headless mode in e2e tests.
- `--inspect-brk` to wait for a debugger to connect, this also automatically disables headless mode for e2e tests (though [this is broken](https://github.com/rendajs/Renda/issues/346) at the moment).
- `--separate-browser-processes` to create a new browser process for every test. This slower but might make tests less flaky ([#328](https://github.com/rendajs/Renda/issues/328))
