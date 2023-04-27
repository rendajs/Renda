import {AssetLoader, AssetLoaderType, EngineAssetsManager} from "../../../../../src/mod.js";
import {assertIsType, testTypes} from "../../../shared/typeAssertions.js";

class Foo {}
const fooInstance = new Foo();
/** @extends {AssetLoaderType<Foo>} */
class FooLoader extends AssetLoaderType {}

testTypes({
	name: "getAsset uses assertion options",
	async fn() {
		const assetLoader = new AssetLoader();
		const manager = new EngineAssetsManager(assetLoader);

		const instanceResult = await manager.getAsset("uuid", {
			assertionOptions: {
				assertInstanceType: Foo,
			},
		});

		// Verify that the type is a Foo instance and nothing else
		assertIsType(fooInstance, instanceResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, instanceResult);

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

testTypes({
	name: "watchAsset uses assertion options",
	async fn() {
		const assetLoader = new AssetLoader();
		const manager = new EngineAssetsManager(assetLoader);

		await manager.watchAsset("uuid", {
			assertionOptions: {
				assertInstanceType: Foo,
			},
		}, asset => {
			// Verify that the type is a Foo instance and nothing else
			assertIsType(fooInstance, asset);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, asset);
		});

		await manager.watchAsset("uuid", {
			assertionOptions: {
				assertLoaderType: FooLoader,
			},
		}, asset => {
			// Verify that the type is a Foo instance and nothing else
			assertIsType(fooInstance, asset);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, asset);
		});
	},
});
