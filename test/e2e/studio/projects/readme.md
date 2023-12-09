This directory contains various projects which can be opened with Renda Studio.
While developing the e2e tests, you can open one of these directories in Renda Studio directly to modify their files.
When running e2e tests, though, these projects are not loaded via the `FsaStudioFileSystem`.
This is because Puppeteer doesn't allow us to control the File System Access api programmatically.
Instead, Deno reads the list of files, the page then fetches them via the local server,
and finally injects them into the page as a `IndexedDbStudioFileSystem`.
This is done in e2e tests by calling `loadE2eProject()` (located at file://./../shared/project.js)
