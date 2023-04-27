import {AssetLoader, AssetLoaderType, EngineAssetsManager} from "../../../../../src/mod.js";
import {assertIsType, testTypes} from "../../../shared/typeAssertions.js";

testTypes({
	name: "getAsset uses assertion options",
	async fn() {
		const assetLoader = new AssetLoader();
		const manager = new EngineAssetsManager(assetLoader);

		class Foo {}
		const instanceResult = await manager.getAsset("uuid", {
			assertionOptions: {
				assertInstanceType: Foo,
			},
		});

		const fooInstance = new Foo();
		// Verify that the type is a Foo instance and nothing else
		assertIsType(fooInstance, instanceResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, instanceResult);

		/** @extends {AssetLoaderType<Foo>} */
		class FooLoader extends AssetLoaderType {}

		const loaderTypeResult = await manager.getAsset("uuid", {
			assertionOptions: {
				assertLoaderType: FooLoader,
			},
		});

		// Verify that the type is a Foo instance and nothing else
		assertIsType(fooInstance, loaderTypeResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, loaderTypeResult);
	},
});
