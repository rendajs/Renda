import {assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {Entity, LightComponent} from "../../../../../src/mod.js";
import {EntityAssetManager} from "../../../../../studio/src/assets/EntityAssetManager.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const BASIC_ENTITY_UUID = "basic entity uuid";

/**
 * @param {object} options
 * @param {Entity} [options.sourceEntity]
 */
function basicSetup({
	sourceEntity = new Entity("my entity"),
} = {}) {
	sourceEntity.add(new Entity("child"));
	const assetManager = /** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		/** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager["getLiveAsset"]} */
		async getLiveAsset(uuid, options) {
			if (uuid == BASIC_ENTITY_UUID) {
				return /** @type {any} */ (sourceEntity);
			}
			throw new Error("Not found");
		},
	});

	const manager = new EntityAssetManager(assetManager);
	manager.setLinkedAssetUuid(sourceEntity, BASIC_ENTITY_UUID);

	return {sourceEntity, assetManager, manager};
}

Deno.test({
	name: "creating a new tracked entity loads the source asset",
	async fn() {
		const {sourceEntity, manager} = basicSetup();

		const entity = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		assertNotStrictEquals(entity, sourceEntity);
		assertEquals(entity.name, "my entity");
		assertEquals(entity.childCount, 1);
		assertEquals(entity.children[0].name, "child");
		assertEquals(manager.getLinkedAssetUuid(entity), BASIC_ENTITY_UUID);
	},
});

Deno.test({
	name: "Changing an entity updates the others",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const entity2 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		assertEquals(entity1.name, "my entity");
		assertEquals(entity2.name, "my entity");

		entity1.name = "new name";
		manager.updateEntity(entity1);
		assertEquals(entity2.name, "new name");

		entity2.name = "new name 2";
		manager.updateEntity(entity2);
		assertEquals(entity1.name, "new name 2");
	},
});

Deno.test({
	name: "Changing child of an entity updates the others",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const entity2 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		assertEquals(entity1.children[0].name, "child");
		assertEquals(entity2.children[0].name, "child");

		entity1.children[0].name = "new name";
		manager.updateEntity(entity1.children[0]);
		assertEquals(entity2.children[0].name, "new name");

		entity2.children[0].name = "new name 2";
		manager.updateEntity(entity2.children[0]);
		assertEquals(entity1.children[0].name, "new name 2");
	},
});

Deno.test({
	name: "Changing an entity does not update itself",
	async fn() {
		const {manager} = basicSetup();
		const entity = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		assertEquals(entity.childCount, 1);
		const initialChild = entity.children[0];

		entity.name = "new name";
		manager.updateEntity(entity);

		assertEquals(entity.childCount, 1);
		assertStrictEquals(entity.children[0], initialChild);
	},
});

Deno.test({
	name: "newly created instances are cloned from the current state",
	async fn() {
		const {manager} = basicSetup();
		const entity1 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		entity1.name = "new name";
		manager.updateEntity(entity1);

		const entity2 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);
		assertEquals(entity2.name, "new name");
	},
});

Deno.test({
	name: "components are cloned",
	async fn() {
		const sourceEntity = new Entity("source");
		sourceEntity.addComponent(LightComponent, {
			intensity: 0.123,
		});

		const {manager} = basicSetup({sourceEntity});
		const entity1 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		assertEquals(entity1.components.length, 1);
		assertInstanceOf(entity1.components[0], LightComponent);
		assertEquals(entity1.components[0].intensity, 0.123);

		const entity2 = manager.createdTrackedEntity(BASIC_ENTITY_UUID);
		assertInstanceOf(entity2.components[0], LightComponent);
		entity2.components[0].intensity = 0.456;
		manager.updateEntity(entity2);

		assertEquals(entity1.components[0].intensity, 0.456);
	},
});

Deno.test({
	name: "Trying to change an entity that is not an instance throws",
	async fn() {
		const {manager} = basicSetup();

		const entity = new Entity();
		assertThrows(() => {
			manager.updateEntity(entity);
		}, Error, "Provided entity is not a child of an entity asset");
	},
});

Deno.test({
	name: "Trying to change an entity that is not being tracked throws",
	async fn() {
		const {manager} = basicSetup();

		const entity = new Entity();
		manager.setLinkedAssetUuid(entity, "non existent uuid");
		assertThrows(() => {
			manager.updateEntity(entity);
		}, Error, "The provided entity asset is not tracked by this EntityAssetManager");
	},
});
