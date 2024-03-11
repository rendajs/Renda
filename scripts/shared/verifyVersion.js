import { RENDA_VERSION_STRING } from "../../src/engineDefines.js";

const expectedVersion = Deno.args[0];
if (RENDA_VERSION_STRING != expectedVersion) {
	console.error(`Expected version to match "${expectedVersion}". Please update studioDefines.js`);
	Deno.exit(1);
}
