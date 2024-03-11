import { BUILD_VERSION_STRING } from "../../studio/src/studioDefines.js";

const expectedVersion = Deno.args[0];
if (BUILD_VERSION_STRING != expectedVersion) {
	console.error(`Expected version to match "${expectedVersion}". Please update studioDefines.js`)
	Deno.exit(1);
}
