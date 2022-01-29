# .denoTypes

The purpose of these files is to add type for modules imported via urls. Deno
and Deno lsp are able to handle url imports just fine, but tsc isn't.

These files are generated when running `./scripts/dev.js` for the first time,
or if the contents of the script have changed since the last run. Though if you
add a new import somewhere, you'll still need to manually update the `"paths"`
property in any `jsconfig.json` so that it points to the newly generated file.

You can also run `./scripts/dev.js --force-fts` to force the generation of these
files, even when nothing changed.
