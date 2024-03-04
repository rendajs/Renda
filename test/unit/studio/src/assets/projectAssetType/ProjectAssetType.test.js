import { assertEquals, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";
import { ProjectAssetType } from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js";

/**
 * @param {object} options
 * @param {(() => void)?} [options.liveAssetNeedsReplacementCb]
 */
function createMockProjectAsset({
	liveAssetNeedsReplacementCb = null,
} = {}) {
	/** @type {Set<() => void>} */
	const onLiveAssetNeedsReplacementCbs = new Set();
	const mockProjectAsset = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({
		onLiveAssetNeedsReplacement(cb) {
			onLiveAssetNeedsReplacementCbs.add(cb);
		},
		removeOnLiveAssetNeedsReplacement(cb) {
			onLiveAssetNeedsReplacementCbs.delete(cb);
		},
		liveAssetNeedsReplacement() {
			if (liveAssetNeedsReplacementCb) liveAssetNeedsReplacementCb();
		},
	});
	return {
		mockProjectAsset,
		fireOnLiveAssetNeedsReplacementCbs() {
			onLiveAssetNeedsReplacementCbs.forEach(cb => cb());
		},
	};
}

function getMocks() {
	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});

	let liveAssetNeedsReplacementCallCount = 0;
	const { mockProjectAsset } = createMockProjectAsset({
		liveAssetNeedsReplacementCb: () => {
			liveAssetNeedsReplacementCallCount++;
		},
	});

	const mockAssetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({});

	const mockAssetTypeManager = /** @type {import("../../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({});

	const projectAssetTypeArgs = /** @type {const} */ ([
		mockStudioInstance,
		mockProjectAsset,
		mockAssetManager,
		mockAssetTypeManager,
	]);

	return {
		mockStudioInstance,
		mockProjectAsset,
		mockAssetManager,
		mockAssetTypeManager,
		projectAssetTypeArgs,
		getLiveAssetNeedsReplacementCallCount() {
			return liveAssetNeedsReplacementCallCount;
		},
	};
}

Deno.test({
	name: "liveAssetNeedsReplacement() requests live asset replacement by default",
	fn() {
		const { projectAssetTypeArgs, getLiveAssetNeedsReplacementCallCount } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);

		projectAssetType.fileChangedExternally();

		assertEquals(getLiveAssetNeedsReplacementCallCount(), 1);
	},
});

Deno.test({
	name: "liveAssetNeedsReplacement() requests live asset replacement",
	fn() {
		const { projectAssetTypeArgs, getLiveAssetNeedsReplacementCallCount } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);

		projectAssetType.liveAssetNeedsReplacement();

		assertEquals(getLiveAssetNeedsReplacementCallCount(), 1);
	},
});

Deno.test({
	name: "listenForUsedLiveAssetChanges() requests live asset replacement when the passed project asset gets a new live asset",
	fn() {
		const { projectAssetTypeArgs, getLiveAssetNeedsReplacementCallCount } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);
		const { mockProjectAsset, fireOnLiveAssetNeedsReplacementCbs } = createMockProjectAsset();

		projectAssetType.listenForUsedLiveAssetChanges(mockProjectAsset);
		assertEquals(getLiveAssetNeedsReplacementCallCount(), 0);

		fireOnLiveAssetNeedsReplacementCbs();

		assertEquals(getLiveAssetNeedsReplacementCallCount(), 1);
	},
});

Deno.test({
	name: "listenForUsedLiveAssetChanges() with null project asset does nothing",
	fn() {
		const { projectAssetTypeArgs, getLiveAssetNeedsReplacementCallCount } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);

		projectAssetType.listenForUsedLiveAssetChanges(null);

		assertEquals(getLiveAssetNeedsReplacementCallCount(), 0);
	},
});

Deno.test({
	name: "destroyLiveAssetData() removes callbacks from listenForUsedLiveAssetChanges()",
	fn() {
		const { projectAssetTypeArgs, getLiveAssetNeedsReplacementCallCount } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);
		const { mockProjectAsset, fireOnLiveAssetNeedsReplacementCbs } = createMockProjectAsset();

		projectAssetType.listenForUsedLiveAssetChanges(mockProjectAsset);
		projectAssetType.destroyLiveAssetData();
		fireOnLiveAssetNeedsReplacementCbs();

		assertEquals(getLiveAssetNeedsReplacementCallCount(), 0);
	},
});

Deno.test({
	name: "destroyLiveAssetData() calls destructor on live asset",
	fn() {
		const { projectAssetTypeArgs } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);

		let destructorCalled = false;
		const liveAsset = {
			destructor() {
				destructorCalled = true;
			},
		};

		projectAssetType.destroyLiveAssetData(liveAsset);

		assertEquals(destructorCalled, true);
	},
});

Deno.test({
	name: "open() sets the project asset as active object in a properties window",
	fn() {
		const { projectAssetTypeArgs, mockProjectAsset } = getMocks();
		const projectAssetType = new ProjectAssetType(...projectAssetTypeArgs);

		/** @type {unknown[][]} */
		const setActiveObjectsCalls = [];
		const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({
			getMostSuitableContentWindow(constructor) {
				return {
					/**
					 * @param {unknown[]} objects
					 */
					setActiveObjects(objects) {
						setActiveObjectsCalls.push(objects);
					},
				};
			},
		});

		projectAssetType.open(mockWindowManager);

		assertEquals(setActiveObjectsCalls, [[mockProjectAsset]]);
		assertStrictEquals(setActiveObjectsCalls[0][0], mockProjectAsset);
	},
});

Deno.test({
	name: "saveLiveAssetData() throws when not implemented",
	async fn() {
		/**
		 * @extends {ProjectAssetType<null, {}, {}>}
		 */
		class ExtendedProjectAssetType extends ProjectAssetType {}

		const { projectAssetTypeArgs } = getMocks();
		const projectAssetType = new ExtendedProjectAssetType(...projectAssetTypeArgs);

		await assertRejects(async () => {
			await projectAssetType.saveLiveAssetData({}, {});
		}, Error, `"ExtendedProjectAssetType" hasn't implemented saveLiveAssetData(). If you're trying to save an embedded asset, this is only supported if all of its parent assets implement saveLiveAssetData().`);
	},
});

Deno.test({
	name: "getUiName()",
	fn() {
		/** @extends {ProjectAssetType<null, {}, {}>} */
		class Type1 extends ProjectAssetType {}
		assertEquals(Type1.getUiName(), "<unknown>");

		/** @extends {ProjectAssetType<null, {}, {}>} */
		class Type2 extends ProjectAssetType {
			static type = "namespace:type";
		}
		assertEquals(Type2.getUiName(), "<namespace:type>");

		/** @extends {ProjectAssetType<null, {}, {}>} */
		class Type3 extends ProjectAssetType {
			static uiName = "UI Name";
		}
		assertEquals(Type3.getUiName(), "UI Name");
	},
});
