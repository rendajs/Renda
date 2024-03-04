import { assertEquals, assertInstanceOf, assertRejects, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { TestAssetBundle } from "./TestAssetBundle.js";
import { forceCleanup, installMockWeakRef, uninstallMockWeakRef } from "../../shared/mockWeakRef.js";
import { waitForMicrotasks } from "../../shared/waitForMicroTasks.js";
import { assertIsType, testTypes } from "../../shared/typeAssertions.js";
import { AssetBundle, AssetLoader, AssetLoaderType } from "../../../../src/mod.js";

const BASIC_ASSET_UUID = "basic asset uuid";
const BASIC_ASSET_TYPE_UUID = "ba51c0000-a55e-7000-778e-00000000441d";

/** @typedef {(buffer: ArrayBuffer, recursionTracker: import("../../../../src/assets/RecursionTracker.js").RecursionTracker, assetOpts: unknown) => unknown} ParseBufferFunction */

/**
 * @param {object} options
 * @param {import("../../../../src/mod.js").UuidString} options.uuid
 * @param {ParseBufferFunction} options.parseBufferFn
 */
function createBasicLoaderType({
	uuid,
	parseBufferFn,
}) {
	/**
	 * @extends {AssetLoaderType<unknown>}
	 */
	class ExtendedAssetLoaderType extends AssetLoaderType {
		static get typeUuid() {
			return uuid;
		}

		/**
		 * @override
		 * @param {ArrayBuffer} buffer
		 * @param {import("../../../../src/assets/RecursionTracker.js").RecursionTracker} recursionTracker
		 * @param {unknown} assetOpts
		 */
		async parseBuffer(buffer, recursionTracker, assetOpts) {
			return parseBufferFn(buffer, recursionTracker, assetOpts);
		}
	}

	return {
		ExtendedAssetLoaderType,
		/**
		 *@param {ParseBufferFunction} newParseBufferFn
		 */
		setParseBufferFn(newParseBufferFn) {
			parseBufferFn = newParseBufferFn;
		},
	};
}

/**
 * @template {boolean} [TRegisterLoaderType = true]
 * @param {object} options
 * @param {TRegisterLoaderType} [options.registerLoaderType]
 * @param {unknown} [options.expectedAsset]
 */
function basicSetup({
	registerLoaderType = /** @type {TRegisterLoaderType} */ (true),
	expectedAsset = /** @type {unknown} */ ({ label: "expected asset" }),
} = {}) {
	installMockWeakRef();
	const assetLoader = new AssetLoader();

	const { ExtendedAssetLoaderType, setParseBufferFn } = createBasicLoaderType({
		uuid: BASIC_ASSET_TYPE_UUID,
		parseBufferFn() {
			return expectedAsset;
		},
	});

	let loaderType = null;
	if (registerLoaderType) {
		loaderType = assetLoader.registerLoaderType(ExtendedAssetLoaderType);
	}
	const castLoaderType = 	/** @type {TRegisterLoaderType extends true ? ExtendedAssetLoaderType : null} */ (loaderType);

	return {
		assetLoader,
		expectedAsset,
		loaderType: castLoaderType,
		ExtendedAssetLoaderType,
		setParseBufferFn,
		uninstall() {
			uninstallMockWeakRef();
		},
	};
}

Deno.test({
	name: "registering an asset loader type that is not an instance of AssetLoaderType shouuld throw",
	fn() {
		class Foo {}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(/** @type {any} */(Foo));
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't extend the AssetLoaderType class.`);
	},
});

Deno.test({
	name: "registering an asset loader type that is missing a typeUuid property should throw",
	fn() {
		/** @extends {AssetLoaderType<unknown>} */
		class Foo extends AssetLoaderType {}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(Foo);
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("").`);
	},
});

Deno.test({
	name: "registering an asset loader type that has an invalid typeUuid property should throw",
	fn() {
		/** @extends {AssetLoaderType<unknown>} */
		class Foo extends AssetLoaderType {
			static get typeUuid() {
				return "not a uuid";
			}
		}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(Foo);
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("not a uuid").`);
	},
});

testTypes({
	name: "registerLoaderType() returns the correct type",
	fn() {
		/** @extends {AssetLoaderType<number, string>} */
		class Foo extends AssetLoaderType {
		}
		const assetLoader = new AssetLoader();
		const loaderType = assetLoader.registerLoaderType(Foo);

		const expectedType = new Foo(assetLoader);

		assertIsType(expectedType, loaderType);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, loaderType);
	},
});

Deno.test({
	name: "addBundle returns the provided bundle and infers its type",
	fn() {
		class BasicExtendedBundle extends AssetBundle {
			/**
			 * @param {number} num
			 * @param {string} str
			 */
			constructor(num, str) {
				super();
				this.num = num;
				this.str = str;
			}
		}

		const loader = new AssetLoader();
		const bundle = loader.addBundle(new BasicExtendedBundle(3, "str"));

		// Verify that the type is a BasicExtendedBundle instance and nothing else
		const basicInstance = new BasicExtendedBundle(1, "str");
		assertIsType(bundle, basicInstance);
		const instance = new AssetBundle();
		// @ts-expect-error Verify that the type isn't 'AssetBundle'
		assertIsType(bundle, instance);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, bundle);

		assertInstanceOf(bundle, BasicExtendedBundle);
		assertEquals(bundle.num, 3);
		assertEquals(bundle.str, "str");
	},
});

Deno.test({
	name: "getting an asset",
	async fn() {
		const { assetLoader, expectedAsset, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset = await getAssetPromise;

			assertStrictEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

testTypes({
	name: "getAsset() return type is unknown without type assertions",
	async fn() {
		const assetLoader = new AssetLoader();
		const result = await assetLoader.getAsset(BASIC_ASSET_UUID, {});

		const unknownType = /** @type {unknown} */ ({});

		// Verify that the type is `unknown` and nothing else
		assertIsType(unknownType, result);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, result);
	},
});

testTypes({
	name: "getAsset() return type is unknown with empty assertionOptions",
	async fn() {
		const assetLoader = new AssetLoader();
		const result = await assetLoader.getAsset(BASIC_ASSET_UUID, {
			assertionOptions: {},
		});

		const unknownType = /** @type {unknown} */ ({});

		// Verify that the type is `unknown` and nothing else
		assertIsType(unknownType, result);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, result);
	},
});

Deno.test({
	name: "getting an asset with the correct LoaderType doesn't throw",
	async fn() {
		const { assetLoader, ExtendedAssetLoaderType, expectedAsset, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID, {
				assertionOptions: {
					assertLoaderType: ExtendedAssetLoaderType,
				},
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset = await getAssetPromise;

			assertStrictEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset with the incorrect LoaderType throws",
	async fn() {
		const { assetLoader, uninstall } = basicSetup();

		/** @extends {AssetLoaderType<unknown>} */
		class WrongAssetLoaderType extends AssetLoaderType {}

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID, {
				assertionOptions: {
					assertLoaderType: WrongAssetLoaderType,
				},
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			await assertRejects(async () => {
				await getAssetPromise;
			}, Error, "The asset did not have the expected assertLoaderType.");
		} finally {
			uninstall();
		}
	},
});

testTypes({
	name: "getAsset() return type uses assertLoaderType assertion",
	async fn() {
		class Foo {}
		/**
		 * @extends {AssetLoaderType<Foo>}
		 */
		class ExtendedAssetLoaderType extends AssetLoaderType {}
		const assetLoader = new AssetLoader();
		const result = await assetLoader.getAsset(BASIC_ASSET_UUID, {
			assertionOptions: {
				assertLoaderType: ExtendedAssetLoaderType,
			},
		});

		const expectedType = new Foo();

		// Verify that the type is `Foo` and nothing else
		assertIsType(expectedType, result);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, result);
	},
});

Deno.test({
	name: "getting an asset with the correct Instance type doesn't throw",
	async fn() {
		class Foo {}
		const { assetLoader, expectedAsset, uninstall } = basicSetup({
			expectedAsset: new Foo(),
		});

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID, {
				assertionOptions: {
					assertInstanceType: Foo,
				},
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset = await getAssetPromise;

			assertStrictEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset with the incorrect Instance type throws",
	async fn() {
		class Foo {}
		class Bar {}
		const { assetLoader, uninstall } = basicSetup({
			expectedAsset: new Foo(),
		});

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID, {
				assertionOptions: {
					assertInstanceType: Bar,
				},
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			await assertRejects(async () => {
				await getAssetPromise;
			}, Error, "The asset did not have the expected assertInstanceType.");
		} finally {
			uninstall();
		}
	},
});

testTypes({
	name: "getAsset() return type uses assertInstanceType assertion",
	async fn() {
		class Foo {}
		const assetLoader = new AssetLoader();
		const result = await assetLoader.getAsset(BASIC_ASSET_UUID, {
			assertionOptions: {
				assertInstanceType: Foo,
			},
		});

		const expectedType = new Foo();

		// Verify that the type is `Foo` and nothing else
		assertIsType(expectedType, result);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, result);
	},
});

Deno.test({
	name: "AssetLoaderType does not have parseBuffer implemented",
	async fn() {
		/** @extends {AssetLoaderType<never>} */
		class LoaderType extends AssetLoaderType {
			static get typeUuid() {
				return BASIC_ASSET_TYPE_UUID;
			}
		}
		const assetLoader = new AssetLoader();
		assetLoader.registerLoaderType(LoaderType);
		const bundle = assetLoader.addBundle(new TestAssetBundle());
		bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
		bundle.setAssetAvailable(BASIC_ASSET_UUID, true);

		await assertRejects(async () => {
			await assetLoader.getAsset(BASIC_ASSET_UUID);
		}, Error, "parseBuffer has not been implemented for this loader type.");
	},
});

Deno.test({
	name: "requesting the same asset twice returns the same instance by default",
	async fn() {
		const { assetLoader, expectedAsset, setParseBufferFn, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset1 = await getAssetPromise1;
			assertStrictEquals(asset1, expectedAsset);

			setParseBufferFn(() => {
				return { label: "unexpected asset" };
			});

			const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset2 = await getAssetPromise2;
			assertStrictEquals(asset2, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when createNewInstance is true",
	async fn() {
		const { assetLoader, expectedAsset: expectedAsset1, setParseBufferFn, uninstall } = basicSetup();
		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID, {
				createNewInstance: true,
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset1 = await getAssetPromise1;
			assertStrictEquals(asset1, expectedAsset1);

			const expectedAsset2 = { label: "expected asset 2" };
			setParseBufferFn(() => expectedAsset2);

			const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID, {
				createNewInstance: true,
			});
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset2 = await getAssetPromise2;
			assertStrictEquals(asset2, expectedAsset2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when the old one was garbage collected",
	async fn() {
		const { assetLoader, expectedAsset: expectedAsset1, setParseBufferFn, uninstall } = basicSetup();
		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset1 = await getAssetPromise1;
			assertStrictEquals(asset1, expectedAsset1);

			forceCleanup(asset1);

			const expectedAsset2 = { label: "expected asset 2" };
			setParseBufferFn(() => expectedAsset2);

			const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			const asset2 = await getAssetPromise2;
			assertStrictEquals(asset2, expectedAsset2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset with no bundles added rejects",
	async fn() {
		const { assetLoader, uninstall } = basicSetup();

		try {
			await assertRejects(async () => {
				await assetLoader.getAsset(BASIC_ASSET_UUID);
			}, Error, `Tried to load an asset with uuid ${BASIC_ASSET_UUID} but the uuid wasn't found in any AssetBundle.`);
		}	finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset that is not available in any bundle rejects",
	async fn() {
		const { assetLoader, uninstall } = basicSetup();
		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, false);

			await assertRejects(async () => {
				await getAssetPromise;
			}, Error, `Tried to load an asset with uuid ${BASIC_ASSET_UUID} but the uuid wasn't found in any AssetBundle.`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset that is available in the second bundle, first bundle resolves first",
	async fn() {
		const { assetLoader, expectedAsset, uninstall } = basicSetup();
		try {
			const bundle1 = assetLoader.addBundle(new TestAssetBundle());
			const bundle2 = assetLoader.addBundle(new TestAssetBundle());
			bundle2.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
			await waitForMicrotasks();
			bundle1.setAssetAvailable(BASIC_ASSET_UUID, false);
			await waitForMicrotasks();
			bundle2.setAssetAvailable(BASIC_ASSET_UUID, true);
			await waitForMicrotasks();
			const asset = await getAssetPromise;

			assertStrictEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getting an asset that is available in the second bundle, second bundle resolves first",
	async fn() {
		const { assetLoader, expectedAsset, uninstall } = basicSetup();
		try {
			const bundle1 = assetLoader.addBundle(new TestAssetBundle());
			const bundle2 = assetLoader.addBundle(new TestAssetBundle());
			bundle2.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
			await waitForMicrotasks();
			bundle2.setAssetAvailable(BASIC_ASSET_UUID, true);
			await waitForMicrotasks();
			bundle1.setAssetAvailable(BASIC_ASSET_UUID, false);
			await waitForMicrotasks();
			const asset = await getAssetPromise;

			assertStrictEquals(asset, expectedAsset);
		}	 finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "loading an asset that doesn't have a registerd loader type rejects",
	async fn() {
		const { assetLoader, uninstall } = basicSetup({ registerLoaderType: false });

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			bundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

			const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
			bundle.setAssetAvailable(BASIC_ASSET_UUID, true);
			await assertRejects(async () => {
				await getAssetPromise;
			}, Error, `Unable to parse asset with uuid "${BASIC_ASSET_UUID}". Its type is not registered, register it first with AssetLoader.registerLoaderType().`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loading an asset that loads another asset",
	async fn() {
		const { assetLoader, setParseBufferFn, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);

			bundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			bundle.setAssetAvailable(FIRST_ASSET_UUID);

			bundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			bundle.setAssetAvailable(SECOND_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						secondAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, (asset) => {
						assetObj.secondAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					return { label: "second asset" };
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			assertEquals(asset, {
				label: "first asset",
				secondAsset: { label: "second asset" },
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loading an assets that load each other as a circular reference",
	async fn() {
		const { assetLoader, setParseBufferFn, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);

			bundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			bundle.setAssetAvailable(FIRST_ASSET_UUID);

			bundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			bundle.setAssetAvailable(SECOND_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, (asset) => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					const assetObj = {
						label: "second asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(FIRST_ASSET_UUID, (asset) => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			const expectedAsset = {
				label: "first asset",
				otherAsset: /** @type {any} */ (null),
			};
			const expectedAsset2 = {
				label: "second asset",
				otherAsset: expectedAsset,
			};
			expectedAsset.otherAsset = expectedAsset2;
			assertEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loading an assets with a circular reference but the root is not part of the circular reference",
	async fn() {
		const { assetLoader, setParseBufferFn, uninstall } = basicSetup();

		try {
			const bundle = assetLoader.addBundle(new TestAssetBundle());
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const THIRD_ASSET_UUID = "third asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);
			const thirdAssetBuffer = new ArrayBuffer(0);

			bundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			bundle.setAssetAvailable(FIRST_ASSET_UUID);

			bundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			bundle.setAssetAvailable(SECOND_ASSET_UUID);

			bundle.setAssetType(THIRD_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			bundle.setAssetBuffer(THIRD_ASSET_UUID, thirdAssetBuffer);
			bundle.setAssetAvailable(THIRD_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, (asset) => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					const assetObj = {
						label: "second asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(THIRD_ASSET_UUID, (asset) => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == thirdAssetBuffer) {
					const assetObj = {
						label: "third asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, (asset) => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			const expectedAsset2 = {
				label: "second asset",
				otherAsset: /** @type {any} */ (null),
			};
			const expectedAsset3 = {
				label: "third asset",
				otherAsset: expectedAsset2,
			};
			expectedAsset2.otherAsset = expectedAsset3;
			const expectedAsset = {
				label: "first asset",
				otherAsset: expectedAsset2,
			};
			assertEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});
