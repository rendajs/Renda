/**
 * @fileoverview It's possible for entities to contain other entity assets as children.
 * This allows for reusing common entities across scenes.
 *
 * These links are only stored in the project files, however.
 * Once entities are bundled, and loaded inside applications, they will be a cloned.
 * Meaning that changes to one entity no longer updates other instances of that entity.
 *
 * Inside Studio, on the other hand, we'll want to show real time updates to any changes by the user.
 * When an entity is modified in one place, it should immediately show the new state on other entities as well.
 * The `EntityAssetManager` takes care of tracking which entities are instances of an entity asset.
 * When a change has been made, the EntityAssetManager is notified of the change,
 * which in turns modifies all the other entities to match the modified one.
 *
 * For simple position/rotation/scale transformations, the entities are modified directly,
 * but for more complex tasks the entity is cloned and replaced entirely.
 */

import {Entity} from "../../../src/mod.js";
import {IterableWeakSet} from "../../../src/util/IterableWeakSet.js";
import {ProjectAssetTypeEntity} from "./projectAssetType/ProjectAssetTypeEntity.js";

export class EntityAssetManager {
	/**
	 * @typedef TrackedEntityData
	 * @property {Entity?} sourceEntity
	 * @property {IterableWeakSet<Entity>} trackedInstances
	 */
	/** @type {Map<import("../../../src/mod.js").UuidString, TrackedEntityData>} */
	#trackedEntities = new Map();
	#assetManager;

	#entityAssetRootUuidSymbol = Symbol("entityAssetUuid");

	/** @typedef {Entity & {[x: symbol]: import("../../../src/mod.js").UuidString}} EntityWithUuidSymbol */

	/**
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 */
	constructor(assetManager) {
		this.#assetManager = assetManager;
	}

	/**
	 * Creates a new entity that stays up to date with any changes to the
	 * linked entity asset belonging to the provided uuid.
	 * Modifications to the returned entity will be overwritten unless you call
	 * {@linkcode updateEntity} or {@linkcode updateEntityPosition} after making your change.
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 */
	createdTrackedEntity(uuid) {
		const entity = new Entity();
		this.#trackEntity(uuid, entity);
		return entity;
	}

	/**
	 * Gets the uuid of the asset that the entity is an instance of, if any.
	 * @param {Entity} entity
	 */
	getLinkedAssetUuid(entity) {
		const castEntity = /** @type {EntityWithUuidSymbol} */ (entity);
		return castEntity[this.#entityAssetRootUuidSymbol];
	}

	/**
	 * Marks the entity as an instance of an asset.
	 * This only assigns an uuid to the entity, to actually start tracking for changes you should use
	 * {@linkcode createTrackedEntity} instead.
	 * @param {Entity} entity
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 */
	setLinkedAssetUuid(entity, uuid) {
		const castEntity = /** @type {EntityWithUuidSymbol} */ (entity);
		castEntity[this.#entityAssetRootUuidSymbol] = uuid;
	}

	/**
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 * @param {Entity} entity
	 */
	#trackEntity(uuid, entity) {
		let trackedData = this.#trackedEntities.get(uuid);
		if (!trackedData) {
			trackedData = {
				sourceEntity: null,
				trackedInstances: new IterableWeakSet(),
			};
			this.#trackedEntities.set(uuid, trackedData);
			this.#loadSourceEntity(uuid, trackedData);
		}
		if (trackedData.sourceEntity) {
			this.#applyEntityClone(trackedData.sourceEntity, entity);
		}
		trackedData.trackedInstances.add(entity);
		this.setLinkedAssetUuid(entity, uuid);
	}

	/**
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 * @param {TrackedEntityData} trackedData
	 */
	async #loadSourceEntity(uuid, trackedData) {
		if (trackedData.sourceEntity) {
			throw new Error("Source entity is already loaded");
		}
		const sourceEntity = await this.#assetManager.getLiveAsset(uuid, {
			assertAssetType: ProjectAssetTypeEntity,
			assertExists: true,
		});
		trackedData.sourceEntity = sourceEntity;
		this.updateEntity(sourceEntity);
	}

	/**
	 * @param {Entity} entity
	 */
	#findRootEntityAsset(entity) {
		for (const child of entity.traverseUp()) {
			const uuid = this.getLinkedAssetUuid(child);
			if (uuid) {
				return {
					root: child,
					uuid,
				};
			}
		}
		throw new Error("Provided entity is not a child of an entity asset");
	}

	/**
	 * Calling this after making a change to an entity will cause all other
	 * instances to get updated with the new state of your provided instance.
	 * This **clones** the entire entity for every instance that exists, which can be a fairly heavy operation.
	 * If the only thing you did was change the position, rotation or scale of an entity,
	 * it's best to use {@linkcode updateEntityPosition} instead.
	 * @param {Entity} entityInstance
	 */
	updateEntity(entityInstance) {
		const {uuid, root} = this.#findRootEntityAsset(entityInstance);
		const trackedData = this.#trackedEntities.get(uuid);
		if (!trackedData) {
			throw new Error("The provided entity asset is not tracked by this EntityAssetManager.");
		}

		if (root != trackedData.sourceEntity) {
			if (!trackedData.sourceEntity) {
				throw new Error("The source entity has not been loaded yet");
			}
			this.#applyEntityClone(root, trackedData.sourceEntity);
		}
		for (const trackedEntity of trackedData.trackedInstances) {
			if (trackedEntity == root) continue;
			this.#applyEntityClone(root, trackedEntity);
		}
	}

	/**
	 * @param {Entity} sourceEntity
	 * @param {Entity} targetEntity
	 */
	#applyEntityClone(sourceEntity, targetEntity) {
		targetEntity.name = sourceEntity.name;
		targetEntity.localMatrix = sourceEntity.localMatrix;

		while (targetEntity.childCount > 0) {
			targetEntity.remove(targetEntity.children[0]);
		}
		for (const child of sourceEntity.children) {
			const clone = child.clone();
			targetEntity.add(clone);
			clone.localMatrix = child.localMatrix;
		}

		while (targetEntity.components.length > 0) {
			targetEntity.removeComponent(targetEntity.components[0]);
		}
		for (const component of sourceEntity.components) {
			targetEntity.addComponent(component.clone());
		}
	}

	/**
	 * Calling this after making a change to an entity will cause all other
	 * instances to get updated with the new transformation of your provided instance.
	 * @param {Entity} entityInstance The entity for which the transformation was changed.
	 */
	updateEntityPosition(entityInstance) {
		throw new Error("not yet implemented");
	}
}
