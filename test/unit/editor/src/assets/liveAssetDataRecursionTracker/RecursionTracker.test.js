import {assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";
import {assertIsError} from "std/testing/asserts.ts";
import {RecursionTracker} from "../../../../../../editor/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js";
import {ProjectAssetType} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";

const BASIC_ROOT_ASSET_UUID = "basic asset uuid";
const BASIC_OTHER_ASSET_UUID = "basic other asset uuid";

/**
 * @extends {ProjectAssetType<any, null, any, unknown>}
 */
class ExtendedProjectAssetType1 extends ProjectAssetType {
	static type = "extended1";
}

/**
 * @extends {ProjectAssetType<any, null, any, unknown>}
 */
class ExtendedProjectAssetType2 extends ProjectAssetType {
	static type = "extended2";
}

/**
 * @param {object} options
 * @param {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny?} [options.rootProjectAssetTypeConstructor]
 * @param {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny?} [options.otherProjectAssetTypeConstructor]
 */
function basicSetup({
	rootProjectAssetTypeConstructor = null,
	otherProjectAssetTypeConstructor = null,
} = {}) {
	const otherProjectAssetLiveAsset1 = Symbol("other project asset live asset 1");
	const otherProjectAssetLiveAsset2 = Symbol("other project asset live asset 2");
	const {projectAsset: mockRootProjectAsset} = createMockProjectAsset({
		liveAsset: otherProjectAssetLiveAsset1,
		projectAssetTypeConstructor: rootProjectAssetTypeConstructor,
	});
	const {projectAsset: mockOtherProjectAsset} = createMockProjectAsset({
		liveAsset: otherProjectAssetLiveAsset1,
		projectAssetTypeConstructor: otherProjectAssetTypeConstructor,
	});

	/** @type {Map<import("../../../../../../src/mod.js").UuidString, Set<import("../../../../../../editor/src/assets/ProjectAsset.js").LiveAssetDataChangeCallbackAny>>} */
	const liveAssetChangeCbs = new Map();

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString} uuid
	 * @param {import("../../../../../../editor/src/assets/ProjectAsset.js").LiveAssetDataChangeCallbackAny} cb
	 */
	function registerLiveAssetChange(uuid, cb) {
		const cbs = liveAssetChangeCbs.get(uuid) || new Set();
		cbs.add(cb);
		liveAssetChangeCbs.set(uuid, cbs);
	}
	stub(mockRootProjectAsset, "registerRecursionTrackerLiveAssetChange", async (assetManager, assetUuid, cb) => {
		registerLiveAssetChange(assetUuid, cb);
	});
	stub(mockOtherProjectAsset, "registerRecursionTrackerLiveAssetChange", async (assetManager, assetUuid, cb) => {
		registerLiveAssetChange(assetUuid, cb);
	});

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString | null | undefined} uuid
	 */
	function getProjectAsset(uuid) {
		if (uuid === BASIC_ROOT_ASSET_UUID) {
			return mockRootProjectAsset;
		} else if (uuid === BASIC_OTHER_ASSET_UUID) {
			return mockOtherProjectAsset;
		}
		return null;
	}

	const mockAssetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		getProjectAssetFromUuidSync(uuid, options) {
			return getProjectAsset(uuid);
		},
		async getProjectAssetFromUuid(uuid, options) {
			return getProjectAsset(uuid);
		},
	});

	const recursionTracker = new RecursionTracker(mockAssetManager, BASIC_ROOT_ASSET_UUID);

	recursionTracker.pushProjectAssetToStack(mockRootProjectAsset);

	return {
		recursionTracker,
		otherProjectAssetLiveAsset1,
		otherProjectAssetLiveAsset2,
		/**
		 * @param {import("../../../../../../src/mod.js").UuidString} uuid
		 * @param {unknown} newLiveAsset
		 */
		fireLiveAssetDataChangeCbs(uuid, newLiveAsset) {
			const cbs = liveAssetChangeCbs.get(uuid);
			if (cbs) {
				cbs.forEach(cb => cb({
					editorData: null,
					liveAsset: newLiveAsset,
				}));
			}
		},
	};
}

Deno.test({
	name: "getLiveAssetData() callback is called only once by default",
	async fn() {
		const {recursionTracker, otherProjectAssetLiveAsset1, otherProjectAssetLiveAsset2, fireLiveAssetDataChangeCbs} = basicSetup();

		const cbSpy = spy();
		recursionTracker.getLiveAssetData(BASIC_OTHER_ASSET_UUID, cbSpy);

		await recursionTracker.waitForAll();

		fireLiveAssetDataChangeCbs(BASIC_OTHER_ASSET_UUID, otherProjectAssetLiveAsset2);

		assertSpyCalls(cbSpy, 1);
		assertSpyCall(cbSpy, 0, {
			args: [
				{
					editorData: null,
					liveAsset: otherProjectAssetLiveAsset1,
				},
			],
		});
	},
});

Deno.test({
	name: "getLiveAssetData() callback is called again when repeatOnLiveAssetChange is true",
	async fn() {
		const {recursionTracker, otherProjectAssetLiveAsset2, fireLiveAssetDataChangeCbs} = basicSetup();

		const cbSpy = spy();
		recursionTracker.getLiveAssetData(BASIC_OTHER_ASSET_UUID, cbSpy, {
			repeatOnLiveAssetChange: true,
		});

		await recursionTracker.waitForAll();

		fireLiveAssetDataChangeCbs(BASIC_OTHER_ASSET_UUID, otherProjectAssetLiveAsset2);

		assertSpyCalls(cbSpy, 2);
	},
});

Deno.test({
	name: "getLiveAssetData() with an asserted asset type, assertion succeeds",
	async fn() {
		const {recursionTracker, otherProjectAssetLiveAsset1} = basicSetup({
			otherProjectAssetTypeConstructor: ExtendedProjectAssetType1,
		});

		const cbSpy = spy();
		recursionTracker.getLiveAssetData(BASIC_OTHER_ASSET_UUID, cbSpy, {
			assertAssetType: ExtendedProjectAssetType1,
		});

		await recursionTracker.waitForAll();

		assertSpyCalls(cbSpy, 1);
		assertSpyCall(cbSpy, 0, {
			args: [
				{
					editorData: null,
					liveAsset: otherProjectAssetLiveAsset1,
				},
			],
		});
	},
});

Deno.test({
	name: "getLiveAssetData() with an asserted asset type, assertion fails",
	async fn() {
		await mockSessionAsync(async () => {
			const consoleErrorSpy = stub(console, "error");
			const {recursionTracker} = basicSetup({
				otherProjectAssetTypeConstructor: ExtendedProjectAssetType2,
			});

			const cbSpy = spy();
			recursionTracker.getLiveAssetData(BASIC_OTHER_ASSET_UUID, cbSpy, {
				assertAssetType: ExtendedProjectAssetType1,
			});

			await recursionTracker.waitForAll();

			assertSpyCalls(cbSpy, 1);
			assertSpyCall(cbSpy, 0, {
				args: [null],
			});
			assertSpyCalls(consoleErrorSpy, 1);
			assertIsError(consoleErrorSpy.calls[0].args[0], Error, `Unexpected asset type while getting project asset. Expected "extended1" but got "extended2".`);
		})();
	},
});
