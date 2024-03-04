import { AssertionError, assert, assertEquals, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls } from "std/testing/mock.ts";
import { forceCleanup, installMockWeakRef, uninstallMockWeakRef } from "../../../../shared/mockWeakRef.js";
import { waitForMicrotasks } from "../../../../shared/waitForMicroTasks.js";
import { BASIC_PROJECTASSETTYPE, basicSetup } from "./shared.js";

const BASIC_PERSISTENCE_KEY = "persistenceKey";

Deno.test({
	name: "creating with isEmbedded true",
	async fn() {
		const { projectAsset, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
		});

		try {
			assertEquals(projectAsset.isEmbedded, true);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "readAssetData() on an embedded asset is an empty object by default",
	async fn() {
		const { projectAsset, mocks, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		mocks.fileSystem.readFile = async () => {
			throw new AssertionError("embedded assets should not read from disk.");
		};

		try {
			const result = await projectAsset.readAssetData();
			assertEquals(result, {});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "writeAssetData() and then readAssetData() on an embedded asset",
	async fn() {
		const { projectAsset, mocks, mockParent, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		try {
			mocks.fileSystem.readFile = async () => {
				throw new AssertionError("embedded assets should not read from disk.");
			};
			mocks.fileSystem.writeFile = async () => {
				throw new AssertionError("embedded assets should not write to disk.");
			};

			const writeData = {
				num: 123,
				str: "foo",
			};

			/** @type {Set<() => void>} */
			const needsSavePromises = new Set();
			let needsSaveCallCount = 0;
			mockParent.childEmbeddedAssetNeedsSave = async () => {
				needsSaveCallCount++;
				/** @type {Promise<void>} */
				const promise = new Promise((r) => needsSavePromises.add(r));
				await promise;
			};

			const writeAssetDataPromise = projectAsset.writeAssetData(writeData);

			let resolved = false;
			writeAssetDataPromise.then(() => {
				resolved = true;
			});
			await waitForMicrotasks();

			assert(!resolved, "writeEmbeddedAssetData() should not resolve until its parent childEmbeddedAssetNeedsSave() resolves.");

			needsSavePromises.forEach((r) => r());
			await writeAssetDataPromise;

			assertEquals(needsSaveCallCount, 1);

			writeData.str = "modification";

			const result = await projectAsset.readAssetData();
			assert(result.str != "modification", "writeAssetData() should make a copy of the data");
			assertEquals(result, {
				num: 123,
				str: "foo",
			});

			result.str = "modification";
			const result2 = await projectAsset.readAssetData();
			assert(result2.str != "modification", "readAssetData() should make a copy of the data");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "readEmbeddedAssetData() throws if the asset is not an embedded asset",
	async fn() {
		const { projectAsset, uninstall } = basicSetup();

		try {
			assertThrows(() => {
				projectAsset.readEmbeddedAssetData();
			}, Error, "Unable to read embeddedassetData, asset is not an embedded asset.");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "writeEmbeddedAssetDataSync() throws if the asset is not an embedded asset",
	async fn() {
		const { projectAsset, uninstall } = basicSetup();

		try {
			assertThrows(() => {
				projectAsset.writeEmbeddedAssetDataSync({
					num: 123,
					str: "foo",
				});
			}, Error, "Unable to write embeddedassetData, asset is not an embedded asset.");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "writeEmbeddedAssetDataSync() and then readEmbeddedAssetData() on an embedded asset",
	async fn() {
		const { projectAsset, mocks, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		try {
			mocks.fileSystem.readFile = async () => {
				throw new AssertionError("embedded assets should not read from disk.");
			};
			mocks.fileSystem.writeFile = async () => {
				throw new AssertionError("embedded assets should not write to disk.");
			};

			const writeData = {
				num: 123,
				str: "foo",
			};

			projectAsset.writeEmbeddedAssetDataSync(writeData);

			writeData.str = "modification";

			const result = projectAsset.readEmbeddedAssetData();
			assert(result.str != "modification", "writeAssetData() should make a copy of the data");
			assertEquals(result, {
				num: 123,
				str: "foo",
			});

			result.str = "modification";
			const result2 = projectAsset.readEmbeddedAssetData();
			assert(result2.str != "modification", "readAssetData() should make a copy of the data");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "childEmbeddedAssetNeedsSave() for an asset type without a propertiesAssetContentStructure",
	async fn() {
		const { projectAsset, uninstall } = basicSetup({
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: ["path", "to", "asset"],
			},
		});

		try {
			await projectAsset.childEmbeddedAssetNeedsSave();
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "writeEmbeddedAssetData() calls childEmbeddedAssetNeedsSave the parent",
	async fn() {
		const { projectAsset, mockParent, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: ["path", "to", "asset"],
			},
		});

		try {
			/** @type {Set<() => void>} */
			const needsSavePromises = new Set();
			let needsSaveCallCount = 0;
			mockParent.childEmbeddedAssetNeedsSave = async () => {
				needsSaveCallCount++;
				/** @type {Promise<void>} */
				const promise = new Promise((r) => needsSavePromises.add(r));
				await promise;
			};

			const writePromise = projectAsset.writeEmbeddedAssetData({
				num: 123,
				str: "foo",
			});

			let resolved = false;
			writePromise.then(() => {
				resolved = true;
			});
			await waitForMicrotasks();

			assert(!resolved, "writeEmbeddedAssetData() should not resolve until its parent childEmbeddedAssetNeedsSave() resolves.");

			needsSavePromises.forEach((r) => r());

			await writePromise;

			assertEquals(needsSaveCallCount, 1);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getLiveAssetData() adds the created live asset to the parent asset",
	async fn() {
		const { projectAsset, addEmbeddedChildLiveAssetSpy, uninstall } = basicSetup({
			setMockEmbeddedParent: true,
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
				embeddedParentPersistenceKey: BASIC_PERSISTENCE_KEY,
			},
		});

		try {
			const liveAssetData = await projectAsset.getLiveAssetData();
			assertSpyCalls(addEmbeddedChildLiveAssetSpy, 1);
			assertSpyCall(addEmbeddedChildLiveAssetSpy, 0, {
				args: [BASIC_PERSISTENCE_KEY, liveAssetData.liveAsset],
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "setEmbeddedChildLiveAsset() and getPreviousEmbeddedLiveAsset()",
	async fn() {
		const { projectAsset, uninstall } = basicSetup();
		installMockWeakRef();

		try {
			const liveAsset = { label: "the live asset" };
			projectAsset.addEmbeddedChildLiveAsset("key", liveAsset);

			const result = projectAsset.getPreviousEmbeddedLiveAsset("key");

			assertStrictEquals(result, liveAsset);
		} finally {
			uninstallMockWeakRef();
			await uninstall();
		}
	},
});

Deno.test({
	name: "getPreviousEmbeddedLiveAsset() returns null if not set",
	async fn() {
		const { projectAsset, uninstall } = basicSetup();
		installMockWeakRef();

		try {
			const result = projectAsset.getPreviousEmbeddedLiveAsset("key");

			assertEquals(result, null);
		} finally {
			uninstallMockWeakRef();
			await uninstall();
		}
	},
});

Deno.test({
	name: "getPreviousEmbeddedLiveAsset() returns null if garbage collected",
	async fn() {
		const { projectAsset, uninstall } = basicSetup();
		installMockWeakRef();

		try {
			const liveAsset = { label: "the live asset" };
			projectAsset.addEmbeddedChildLiveAsset("key", liveAsset);

			forceCleanup(liveAsset);

			const result = projectAsset.getPreviousEmbeddedLiveAsset("key");

			assertEquals(result, null);
		} finally {
			uninstallMockWeakRef();
			await uninstall();
		}
	},
});
