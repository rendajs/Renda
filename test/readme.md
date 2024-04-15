# Testing

There are two test suites: `e2e` and `unit`. These are not 'end to end' and 'unit' tests
in the strict sense in that unit tests only test for very small isolated functions
and that e2e tests are testing a full flows in studio.
But rather, the unit tests are fast and the e2e tests require puppeteer in order to run, making them slower and more flaky.

To run tests you can run `deno task test` or `./scripts/test.js`.
You can optionally provide a path to only run a specific portion of the test suite.
`./scripts/test.js test/unit` only runs the unit test suite for example.

The test script takes some optional parameters:

- `-i`, `--inspect` to wait for a debugger to connect, this also automatically enables debug mode in minified tests, disables headless mode for e2e tests, disables e2e test timeouts, and forces e2e tests to run only once.
- `-h`, `--headless` toggles the default headless behaviour. Headless mode is disabled by default unless `-i` or `--inspect` have been specified.
- `-c`, `--coverage` generates a coverage file in `.lcov` format. This is useful if your IDE supports it.
- `-d`, `--debug` when running minified tests, the tests are not minified as much. This makes it easier to debug issues. This flag is automatically set when `-i` or `--inspect` has been provided.
- `--no-build` when running minified tests, no minified build is made at all. This makes it easier to debug issues.

## Unit tests

The unit tests are located at `/test/unit`.
Test files share the same path as the file they are supposed to be testing.
So if you have a `Foo` class inside `/studio/src/path/to/Foo.js`,
then it's test file will be at `/test/unit/studio/src/path/to/Foo.js`.

### Debugging unit tests

You can use the `-i` or `--inspect` flag to start an inspector while running the tests.
However, a new inspector is opened for every test file, so you'll want to specify a path to the test that you wish to run.
If you want to further filter out other tests you can use [the `only` option from Deno](https://deno.land/manual@v1.30.3/basics/testing#filtering-in-only-run-these-tests).

### Code that needs the dom

Some code, especially code making use of TreeViews, require the dom in order to run.
More often than not you can make use of `runWithDom()` which creates a very basic mocked dom using [`fake-dom`](https://github.com/jespertheend/fake-dom).
It is pretty lightweight so as to not slow tests down.
But because of this you might run into situations that have not been mocked.
If what you would like to mock is too much of an edge case, it's best to mock the missing functionality within the test file that needs it.
Otherwise it's better to open up a PR in [`fake-dom`](https://github.com/jespertheend/fake-dom).

## Minified tests

We want to make sure Renda stays usable in minified applications with mangled properties.
The 'minified' tests located at `/test/minified` check for any regressions regarding the mangling of properties.
Before these tests are run, a minified build of all the tests is made.

These tests can't be filtered from the command line, so you have to either run all of them or use the `only` property of `Deno.test`.

You may also run the tests without making a minified build using the `--no-build` argument.
With this flag it becomes possible to only run a subset of the tests but the code may differ from the minified build.
Specifically, properties are no longer mangled, so tests are more likely to pass.
But on top of that, some tests also make use of both both minified and unminified class instances from Renda.
These imports will point to the same module without a build,
whereas it would point to two different modules in the minified version.

## E2e tests

The end to end tests are located at `/test/e2e/`.
A single browser process is started and each test connects to this process separately.
`getContext()` creates a new incognito window so that every test starts with a fresh environment.

### Debugging e2e tests.
To debug tests, the `-i` flag will automatically start an inspector and start the browser in headful mode.
This starts two inspectors: a test inspector and a browser inspector.

The test inspector is the same as when writing unit tests. You can connect to it with your ide or via `chrome://inspect`.
The browser inspector is opened to the side of the opened browser window.

### e2e global variable in studio

Studio contains a global variable called `e2e`.
This contains the utility functions found at `/studio/src/util/e2e/mod.js`.
Writing large amounts of code inside `page.evaluate()` is not easy if you want to set breakpoints.
In that case it is better to add a function to the e2e utilities module and invoke that from `page.evaluate()` instead.

This module also contains functions not called by tests, but that you can use to help you with writing tests.
For example, calling `e2e.logTreeViewPath($0)` will tell you the path that would need to be passed into the
`getTreeViewItemElement()` function in `test/e2e/studio/shared/treeView.js`.
In this case `$0` is [the most recently selected node](https://developer.chrome.com/blog/the-currently-selected-dom-node/).

### Inspecting on Linux

If you're running Linux and the e2e tests keep hanging at 'Launching [path to chrome]',
This is likely because some executables are missing the required permissions.
You can verify this by trying to execute the path to chrome manually.
When doing so, you'll likely see something like:

```
spawn_subprocess.cc(221)] posix_spawn: Permission denied
```

You can solve this by adding execute permissions to `chrome_crashpad_handler`:

```
chmod +x chrome_crashpad_handler
```

## Shared folders

Some folders contain a `shared` folder, these contain code shared by more than one test file,
such as mock or assertion utilities.
