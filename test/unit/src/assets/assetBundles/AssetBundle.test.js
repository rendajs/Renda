import { assertEquals } from "std/testing/asserts.ts";
import { AssetBundle } from "../../../../../src/mod.js";

Deno.test({
	name: "Methods return the correct value by default",
	async fn() {
		const bundle = new AssetBundle();
		assertEquals(await bundle.hasAsset("uuid"), false);
		assertEquals(await bundle.waitForAssetAvailable("uuid"), false);
		assertEquals(await bundle.getAsset("uuid"), null);
	},
});
