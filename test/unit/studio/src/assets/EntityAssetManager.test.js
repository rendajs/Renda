import {assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity, LightComponent} from "../../../../../src/mod.js";
import {EntityAssetManager, EntityChangeType} from "../../../../../studio/src/assets/EntityAssetManager.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";

const BASIC_ENTITY_UUID = "basic entity uuid";
const NESTED_ENTITY_UUID = "nested entity uuid";

/**
 * @param {object} options
 * @param {Entity} [options.sourceEntity]
 * @param {Entity} [options.nestedEntity]
 */
function basicSetup({
	sourceEntity,
	nestedEntity,
} = {}) {
	if (!sourceEntity) {
		sourceEntity = new Entity("my entity");
		sourceEntity.add(new Entity("child"));
	}
	if (!nestedEntity) {
		nestedEntity = new Entity("nested entity");
	}
	const assetManager = /** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		/** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager["getLiveAsset"]} */
		async getLiveAsset(uuid, options) {
			if (uuid == BASIC_ENTITY_UUID) {
				return /** @type {any} */ (sourceEntity);
			}
			if (uuid == NESTED_ENTITY_UUID) {
				return /** @type {any} */ (nestedEntity);
			}
			throw new Error("Not found");
		},
	});

	const manager = new EntityAssetManager(assetManager);
	manager.setLinkedAssetUuid(sourceEntity, BASIC_ENTITY_UUID);
	manager.setLinkedAssetUuid(nestedEntity, NESTED_ENTITY_UUID);

	return {sourceEntity, assetManager, manager};
}

Deno.test({
	name: "creating a new tracked entity loads the source asset",
	async fn() {
		const {sourceEntity, manager} = basicSetup();

		const entity = manager.createTrackedEntity(BASIC_ENTITY_UUID);

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
	name: "replaceTrackedEntity starts tracking entities and replaces existing ones",
	async fn() {
		const {manager} = basicSetup();

		const trackedEntity = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const replacement = new Entity("replacement");
		replacement.add(new Entity("child"));

		manager.replaceTrackedEntity(BASIC_ENTITY_UUID, replacement);

		assertEquals(trackedEntity.name, "replacement");
		assertEquals(trackedEntity.childCount, 1);
		assertEquals(trackedEntity.children[0].name, "child");

		// Check if the replacement is being tracked
		replacement.name = "new name";
		manager.updateEntity(replacement, EntityChangeType.Rename);
		assertEquals(trackedEntity.name, "new name");
	},
});

Deno.test({
	name: "replaceTrackedEntity loads the source and replaces it",
	async fn() {
		const {manager} = basicSetup();

		const replacement = new Entity("replacement");
		replacement.add(new Entity("child"));

		manager.replaceTrackedEntity(BASIC_ENTITY_UUID, replacement);

		// Wait for source entity to load
		await waitForMicrotasks();

		// Newly created entities get cloned from the correct source state as well
		const trackedEntity = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		assertEquals(trackedEntity.name, "replacement");
		assertEquals(trackedEntity.childCount, 1);
		assertEquals(trackedEntity.children[0].name, "child");
	},
});

Deno.test({
	name: "Changing an entity updates the others",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		assertEquals(entity1.name, "my entity");
		assertEquals(entity2.name, "my entity");

		entity1.name = "new name";
		manager.updateEntity(entity1, EntityChangeType.Rename);
		assertEquals(entity2.name, "new name");

		entity2.name = "new name 2";
		manager.updateEntity(entity2, EntityChangeType.Rename);
		assertEquals(entity1.name, "new name 2");
	},
});

Deno.test({
	name: "Changing child of an entity updates the others",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		assertEquals(entity1.children[0].name, "child");
		assertEquals(entity2.children[0].name, "child");

		entity1.children[0].name = "new name";
		manager.updateEntity(entity1.children[0], EntityChangeType.Rename);
		assertEquals(entity2.children[0].name, "new name");

		entity2.children[0].name = "new name 2";
		manager.updateEntity(entity2.children[0], EntityChangeType.Rename);
		assertEquals(entity1.children[0].name, "new name 2");
	},
});

Deno.test({
	name: "Changing an entity does not update itself",
	async fn() {
		const {manager} = basicSetup();
		const entity = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		assertEquals(entity.childCount, 1);
		const initialChild = entity.children[0];

		entity.name = "new name";
		manager.updateEntity(entity, EntityChangeType.Rename);

		assertEquals(entity.childCount, 1);
		assertStrictEquals(entity.children[0], initialChild);
	},
});

Deno.test({
	name: "Changing an entity fires events",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent[]} */
		const calls = [];
		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeCallback} */
		const onChangeFn = e => {
			calls.push(e);
		};
		manager.onTrackedEntityChange(entity2, onChangeFn);

		entity1.name = "new name";
		manager.updateEntity(entity1, EntityChangeType.Rename);
		assertEquals(calls.length, 1);
		assertStrictEquals(calls[0].entity, entity2);
		assertEquals(calls[0].type, EntityChangeType.Rename);

		entity1.name = "new name 2";
		manager.updateEntity(entity1, EntityChangeType.Rename);
		assertEquals(calls.length, 2);

		entity2.name = "new name 2";
		manager.updateEntity(entity2, EntityChangeType.Rename);
		assertEquals(calls.length, 2);

		manager.removeOnTrackedEntityChange(entity2, onChangeFn);

		entity2.name = "new name 4";
		manager.updateEntity(entity2, EntityChangeType.Rename);
		assertEquals(calls.length, 2);
	},
});

Deno.test({
	name: "Changing nested entity assets updates them and fires events",
	async fn() {
		const {manager} = basicSetup();

		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		// Wait for source entity to load
		await waitForMicrotasks();
		const initialChild1 = entity1.children[0];

		const nestedEntityAsset1a = manager.createTrackedEntity(NESTED_ENTITY_UUID);
		initialChild1.add(nestedEntityAsset1a);

		const nestedEntityAsset1b = manager.createTrackedEntity(NESTED_ENTITY_UUID);
		initialChild1.add(nestedEntityAsset1b);

		// Wait for nested entity to load
		await waitForMicrotasks();

		manager.updateEntity(entity1, EntityChangeType.Create);

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		// Wait for source entity to load
		await waitForMicrotasks();
		const child2 = entity2.children[0];

		assertEquals(entity2.name, "my entity");
		assertEquals(entity2.children[0].name, "child");
		assertEquals(entity2.children[0].children[0].name, "nested entity");
		assertEquals(entity2.children[0].children[1].name, "nested entity");

		// Register the events
		/** @type {{trackedEntity: Entity, event: import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent}[]} */
		const calls = [];
		let callCount = 0;
		manager.onTrackedEntityChange(entity1, event => {
			calls.push({trackedEntity: entity1, event});
		});
		manager.onTrackedEntityChange(nestedEntityAsset1b, event => {
			calls.push({trackedEntity: nestedEntityAsset1b, event});
		});
		manager.onTrackedEntityChange(nestedEntityAsset1a, event => {
			calls.push({trackedEntity: nestedEntityAsset1a, event});
		});

		// First we change a child that is not an entity asset.
		// This should only fire a single event on the root entity.
		child2.name = "new child name";
		manager.updateEntity(child2, EntityChangeType.Rename);
		callCount++;
		assertEquals(calls.length, callCount);
		assertStrictEquals(calls[0].trackedEntity, entity1);
		assertStrictEquals(calls[0].event.entity, entity1.children[0]);

		assertEquals(entity2.name, "my entity");
		assertEquals(entity2.children[0].name, "new child name");
		assertEquals(entity2.children[0].children[0].name, "nested entity");
		assertEquals(entity2.children[0].children[1].name, "nested entity");

		// Changing a nested child entity asset should update all the others
		nestedEntityAsset1a.name = "new nested asset name";
		manager.updateEntity(nestedEntityAsset1a, EntityChangeType.Rename);

		callCount += 2;
		assertEquals(calls.length, callCount);
		assertStrictEquals(calls[1].trackedEntity, nestedEntityAsset1b);
		assertStrictEquals(calls[1].event.entity, initialChild1.children[0]);
		assertStrictEquals(calls[2].trackedEntity, entity1);
		assertStrictEquals(calls[2].event.entity, initialChild1.children[0]);

		assertEquals(entity2.name, "my entity");
		assertEquals(entity2.children[0].name, "new child name");
		assertEquals(entity2.children[0].children[0].name, "new nested asset name");
		assertEquals(entity2.children[0].children[1].name, "new nested asset name");
	},
});

Deno.test({
	name: "newly created instances are cloned from the current state",
	async fn() {
		const {manager} = basicSetup();
		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		entity1.name = "new name";
		manager.updateEntity(entity1, EntityChangeType.Rename);

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
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
		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		assertEquals(entity1.components.length, 1);
		assertInstanceOf(entity1.components[0], LightComponent);
		assertEquals(entity1.components[0].intensity, 0.123);

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		assertInstanceOf(entity2.components[0], LightComponent);
		entity2.components[0].intensity = 0.456;
		manager.updateEntity(entity2, EntityChangeType.ComponentProperty);

		assertEquals(entity1.components[0].intensity, 0.456);
	},
});

Deno.test({
	name: "Trying to change an entity that is not an instance throws",
	async fn() {
		const {manager} = basicSetup();

		const entity = new Entity("root");
		const child = entity.add(new Entity("child"));
		manager.updateEntity(entity, EntityChangeType.Create);
		manager.updateEntityPosition(entity);
		assertStrictEquals(entity.children[0], child);
	},
});

Deno.test({
	name: "Trying to change an entity that is not being tracked does nothing",
	async fn() {
		const {manager} = basicSetup();

		const entity = new Entity("root");
		const child = entity.add(new Entity("child"));
		manager.setLinkedAssetUuid(entity, "non existent uuid");
		manager.updateEntity(entity, EntityChangeType.Create);
		manager.updateEntityPosition(entity);
		assertStrictEquals(entity.children[0], child);
	},
});

Deno.test({
	name: "Changing an entity position updates the others and fires events",
	async fn() {
		const sourceEntity = new Entity("root");
		sourceEntity.add(new Entity("dummy"));
		const childA = sourceEntity.add(new Entity("childA"));
		sourceEntity.add(new Entity("dummy"));
		childA.add(new Entity("childB"));
		childA.add(new Entity("dummy"));

		const {manager} = basicSetup({sourceEntity});

		const entity1 = manager.createTrackedEntity(BASIC_ENTITY_UUID);

		// Wait for source entity to load
		await waitForMicrotasks();

		const child1A = entity1.children[1];
		const child1B = child1A.children[0];

		const entity2 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		const child2A = entity2.children[1];
		const child2B = child2A.children[0];

		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent[]} */
		const calls = [];
		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeCallback} */
		const onChangeFn = e => {
			calls.push(e);
		};
		manager.onTrackedEntityChange(entity2, onChangeFn);
		let originalCallCount = 0;
		manager.onTrackedEntityChange(entity1, () => {
			originalCallCount++;
		});

		child1A.pos.set(1, 2, 3);
		manager.updateEntityPosition(child1A);
		assertVecAlmostEquals(child2A.pos, [1, 2, 3]);
		assertEquals(calls.length, 1);
		assertEquals(calls[0].type, EntityChangeType.Transform);
		assertStrictEquals(calls[0].entity, child2A);

		child1B.pos.set(4, 5, 6);
		manager.updateEntityPosition(child1B);
		assertVecAlmostEquals(child2B.pos, [4, 5, 6]);
		assertEquals(calls.length, 2);
		assertEquals(calls[1].type, EntityChangeType.Transform);
		assertStrictEquals(calls[1].entity, child2B);

		manager.removeOnTrackedEntityChange(entity2, onChangeFn);
		child1A.pos.set(7, 8, 9);
		manager.updateEntityPosition(child1A);
		assertVecAlmostEquals(child2A.worldPos, child1A.worldPos);
		assertEquals(calls.length, 2);

		assertEquals(originalCallCount, 0);
	},
});
