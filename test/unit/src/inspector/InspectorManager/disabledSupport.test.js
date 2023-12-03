import {Importer} from "fake-imports";
import {assertEquals} from "std/testing/asserts.ts";

const importer = new Importer(import.meta.url);
importer.fakeModule("../../../../../src/studioDefines.js", `
export const ENABLE_INSPECTOR_SUPPORT = false;
`);

/** @type {import("../../../../../src/inspector/InspectorManager.js")} */
const InspectorManagerMod = await importer.import("../../../../../src/inspector/InspectorManager.js");
const {InspectorManager} = InspectorManagerMod;

Deno.test({
	name: "Does nothing when support is not enabled",
	async fn() {
		const manager = new InspectorManager();
		const raceResult = await manager.raceAllConnections({
			async cb() {
				return "not the default";
			},
			defaultReturnValue: "default",
		});
		assertEquals(raceResult, "default");
	},
});
