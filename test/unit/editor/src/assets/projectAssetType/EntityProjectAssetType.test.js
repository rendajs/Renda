import {assertEquals} from "std/testing/asserts";
import "../../../shared/initializeEditor.js";
import {EntityProjectAssetType} from "../../../../../../editor/src/assets/projectAssetType/EntityProjectAssetType.js";

Deno.test("reload component values when changed", async () => {
	const fakeUuid = "00000000-0000-0000-0000-000000000000";

	const initialMesh = {};
	const replacedMesh = {};

	class FakeRecursionTracker {
		onChangeCbs = new Set();
		/**
		 * @param {import("../../../../../../src/util/mod.js").UuidString} uuid
		 * @param {(mesh: {}?) => void} cb
		 */
		getLiveAsset(uuid, cb, {repeatOnLiveAssetChange = false}) {
			if (uuid == fakeUuid) {
				cb(initialMesh);
			} else {
				cb(null);
			}
			this.onChangeCbs.add(cb);
		}
	}

	const originalComponentData = {
		mesh: fakeUuid,
	};
	/** @type {any} */
	const newComponentData = {};
	const fakeRecursionTracker = new FakeRecursionTracker();
	const assetType = new EntityProjectAssetType(/** @type {any} */({}), /** @type {any} */ ({}), /** @type {any} */ ({}), /** @type {any} */ ({}));

	assetType.fillComponentPropertyValueFromJson(newComponentData, originalComponentData, "mesh", "droppable", {}, /** @type {any} */ (fakeRecursionTracker));

	fakeRecursionTracker.onChangeCbs.forEach(cb => cb(replacedMesh));

	assertEquals(newComponentData.mesh, replacedMesh);
});
