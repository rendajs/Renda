import {describe, expect, it, run} from "https://deno.land/x/tincan/mod.ts";
import "../../../shared/initializeEditor.js";
import {ProjectAssetTypeEntity} from "../../../../../src/Assets/ProjectAssetType/ProjectAssetTypeEntity.js";

describe("ProjectAssetTypeEntity", () => {
	it("reloads component values when they change", async () => {
		const fakeUuid = "00000000-0000-0000-0000-000000000000";

		const initialMesh = {};
		const replacedMesh = {};

		class FakeRecursionTracker {
			onChangeCbs = new Set();
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
		const newComponentData = {};
		const fakeRecursionTracker = new FakeRecursionTracker();
		const assetType = new ProjectAssetTypeEntity({}, {}, {}, {});

		assetType.fillComponentPropertyValueFromJson(newComponentData, originalComponentData, "mesh", "droppable", {}, fakeRecursionTracker);

		fakeRecursionTracker.onChangeCbs.forEach(cb => cb(replacedMesh));

		expect(newComponentData.mesh).toBe(replacedMesh);
	});
});

run();
