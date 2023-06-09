import {assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity, LightComponent} from "../../../../../src/mod.js";
import {EntityAssetManager, EntityChangeType} from "../../../../../studio/src/assets/EntityAssetManager.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

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
		manager.updateEntity(replacement, EntityChangeType.Rename, null);
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
		manager.updateEntity(entity1, EntityChangeType.Rename, null);
		assertEquals(entity2.name, "new name");

		entity2.name = "new name 2";
		manager.updateEntity(entity2, EntityChangeType.Rename, null);
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
		manager.updateEntity(entity1.children[0], EntityChangeType.Rename, null);
		assertEquals(entity2.children[0].name, "new name");

		entity2.children[0].name = "new name 2";
		manager.updateEntity(entity2.children[0], EntityChangeType.Rename, null);
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
		manager.updateEntity(entity, EntityChangeType.Rename, null);

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
		const eventSource1 = Symbol("eventSource1");
		manager.updateEntity(entity1, EntityChangeType.Rename, eventSource1);
		assertEquals(calls.length, 1);
		assertStrictEquals(calls[0].sourceEntity, entity1);
		assertStrictEquals(calls[0].targetEntity, entity2);
		assertEquals(calls[0].type, EntityChangeType.Rename);
		assertStrictEquals(calls[0].source, eventSource1);

		entity1.name = "new name 2";
		manager.updateEntity(entity1, EntityChangeType.Rename, null);
		assertEquals(calls.length, 2);

		entity2.name = "new name 2";
		const eventSource2 = Symbol("eventSource2");
		manager.updateEntity(entity2, EntityChangeType.Rename, eventSource2);
		assertEquals(calls.length, 3);
		assertStrictEquals(calls[2].sourceEntity, entity2);
		assertStrictEquals(calls[2].targetEntity, entity2);
		assertEquals(calls[2].type, EntityChangeType.Rename);
		assertStrictEquals(calls[2].source, eventSource2);

		manager.removeOnTrackedEntityChange(entity2, onChangeFn);

		entity2.name = "new name 4";
		manager.updateEntity(entity2, EntityChangeType.Rename, null);
		assertEquals(calls.length, 3);
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

		manager.updateEntity(entity1, EntityChangeType.Create, null);

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
		const eventSource1 = Symbol("eventSource1");
		manager.updateEntity(child2, EntityChangeType.Rename, eventSource1);
		callCount++;
		assertEquals(calls.length, callCount);
		assertStrictEquals(calls[0].trackedEntity, entity1);
		assertStrictEquals(calls[0].event.sourceEntity, entity2.children[0]);
		assertStrictEquals(calls[0].event.targetEntity, entity1.children[0]);
		assertStrictEquals(calls[0].event.source, eventSource1);

		assertEquals(entity2.name, "my entity");
		assertEquals(entity2.children[0].name, "new child name");
		assertEquals(entity2.children[0].children[0].name, "nested entity");
		assertEquals(entity2.children[0].children[1].name, "nested entity");

		// Changing a nested child entity asset should update all the others
		nestedEntityAsset1a.name = "new nested asset name";
		const eventSource2 = Symbol("eventSource2");
		manager.updateEntity(nestedEntityAsset1a, EntityChangeType.Rename, eventSource2);

		callCount += 4;
		assertEquals(calls.length, callCount);
		assertStrictEquals(calls[1].trackedEntity, nestedEntityAsset1b);
		assertStrictEquals(calls[1].event.sourceEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[1].event.targetEntity, initialChild1.children[0]);
		assertStrictEquals(calls[1].event.source, eventSource2);
		assertStrictEquals(calls[2].trackedEntity, entity1);
		assertStrictEquals(calls[2].event.sourceEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[2].event.targetEntity, initialChild1.children[0]);
		assertStrictEquals(calls[2].event.source, eventSource2);
		assertStrictEquals(calls[3].trackedEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[3].event.sourceEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[3].event.targetEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[3].event.source, eventSource2);
		assertStrictEquals(calls[4].trackedEntity, entity1);
		assertStrictEquals(calls[4].event.sourceEntity, nestedEntityAsset1a);
		assertStrictEquals(calls[4].event.targetEntity, initialChild1.children[1]);
		assertStrictEquals(calls[4].event.source, eventSource2);

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
		manager.updateEntity(entity1, EntityChangeType.Rename, null);

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
		manager.updateEntity(entity2, EntityChangeType.ComponentProperty, null);

		assertEquals(entity1.components[0].intensity, 0.456);
	},
});

Deno.test({
	name: "Trying to change an entity that is not an instance throws",
	async fn() {
		const {manager} = basicSetup();

		const entity = new Entity("root");
		const child = entity.add(new Entity("child"));
		manager.updateEntity(entity, EntityChangeType.Create, null);
		manager.updateEntityTransform(entity, null);
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
		manager.updateEntity(entity, EntityChangeType.Create, null);
		manager.updateEntityTransform(entity, null);
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

		/** @type {{trackedEntity: Entity, event: import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent}[]} */
		const calls = [];
		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeCallback} */
		const onChange2Fn = event => {
			calls.push({trackedEntity: entity2, event});
		};
		manager.onTrackedEntityChange(entity2, onChange2Fn);
		manager.onTrackedEntityChange(entity1, event => {
			calls.push({trackedEntity: entity1, event});
		});

		child1A.pos.set(1, 2, 3);
		const eventSource1 = Symbol("eventSource1");
		manager.updateEntityTransform(child1A, eventSource1);
		assertVecAlmostEquals(child2A.pos, [1, 2, 3]);
		assertEquals(calls.length, 2);
		assertEquals(calls[0].trackedEntity, entity2);
		assertEquals(calls[0].event.type, EntityChangeType.Transform);
		assertStrictEquals(calls[0].event.sourceEntity, child1A);
		assertStrictEquals(calls[0].event.targetEntity, child2A);
		assertStrictEquals(calls[0].event.source, eventSource1);
		assertEquals(calls[1].trackedEntity, entity1);
		assertEquals(calls[1].event.type, EntityChangeType.Transform);
		assertStrictEquals(calls[1].event.sourceEntity, child1A);
		assertStrictEquals(calls[1].event.targetEntity, child1A);
		assertStrictEquals(calls[1].event.source, eventSource1);

		child1B.pos.set(4, 5, 6);
		const eventSource2 = Symbol("eventSource2");
		manager.updateEntityTransform(child1B, eventSource2);
		assertVecAlmostEquals(child2B.pos, [4, 5, 6]);
		assertEquals(calls.length, 4);
		assertEquals(calls[2].trackedEntity, entity2);
		assertEquals(calls[2].event.type, EntityChangeType.Transform);
		assertStrictEquals(calls[2].event.sourceEntity, child1B);
		assertStrictEquals(calls[2].event.targetEntity, child2B);
		assertStrictEquals(calls[2].event.source, eventSource2);
		assertEquals(calls[3].trackedEntity, entity1);
		assertEquals(calls[3].event.type, EntityChangeType.Transform);
		assertStrictEquals(calls[3].event.sourceEntity, child1B);
		assertStrictEquals(calls[3].event.targetEntity, child1B);
		assertStrictEquals(calls[3].event.source, eventSource2);

		manager.removeOnTrackedEntityChange(entity2, onChange2Fn);
		child1A.pos.set(7, 8, 9);
		manager.updateEntityTransform(child1A, null);
		assertVecAlmostEquals(child2A.worldPos, child1A.worldPos);
		assertEquals(calls.length, 5);
		assertEquals(calls[4].trackedEntity, entity1);

		// Create a new tracked entity to verify that the source entity was updated as well
		const entity3 = manager.createTrackedEntity(BASIC_ENTITY_UUID);
		const child3A = entity3.children[1];
		const child3B = child3A.children[0];
		assertVecAlmostEquals(child3A.worldPos, child1A.worldPos);
		assertVecAlmostEquals(child3B.pos, [4, 5, 6]);
	},
});

Deno.test({
	name: "entities without an asset uuid can still be used for events",
	fn() {
		const {manager} = basicSetup();
		const entity = new Entity();
		/** @type {import("../../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeCallback} */
		const onChangeFn = event => {};
		const onChangeSpy = spy(onChangeFn);
		manager.onTrackedEntityChange(entity, onChangeSpy);

		const eventSource1 = Symbol("eventSource1");
		manager.updateEntity(entity, EntityChangeType.Rename, eventSource1);

		assertSpyCalls(onChangeSpy, 1);
		assertStrictEquals(onChangeSpy.calls[0].args[0].source, eventSource1);
		assertStrictEquals(onChangeSpy.calls[0].args[0].sourceEntity, entity);
		assertStrictEquals(onChangeSpy.calls[0].args[0].targetEntity, entity);
	},
});
