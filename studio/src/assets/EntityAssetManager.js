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
import {EventHandler} from "../../../src/util/EventHandler.js";
import {IterableWeakSet} from "../../../src/util/IterableWeakSet.js";
import {ProjectAssetTypeEntity} from "./projectAssetType/ProjectAssetTypeEntity.js";

/**
 * @readonly
 * @enum {number}
 */
export const EntityChangeType = {
	/** Special flag that is only set when loading an entity for the first time. In this case all other flags are also set as well. */
	Load: 1 << 0,
	/** A new child has been added to the hierarchy. */
	Create: 1 << 1,
	/** A child has been removed from the hierarchy. */
	Delete: 1 << 2,
	/** The entity or one of its children has a new name. */
	Rename: 1 << 3,
	/** A child has been moved to another location in the hierarchy. */
	Rearrange: 1 << 4,
	/** The entity or one of its children has a new position, rotation, or scale. */
	Transform: 1 << 5,
	/** A new component has been added to the entity or one of its children. */
	CreateComponent: 1 << 6,
	/** A new component has been removed from the entity or one of its children. */
	DeleteComponent: 1 << 7,
	/** The order of components has been changed for the entity or one of its children. */
	RearrangeComponent: 1 << 8,
	/** The property value of one of the components has been changed. */
	ComponentProperty: 1 << 9,

	/** Shorthand for `Create | Delete | Rename | Rearrange` */
	Hierarchy: 0, // will be set below
	/** Shorthand for `CreateComponent | DeleteComponent | RearrangeComponent | ComponentProperty` */
	Component: 0, // will be set below

	/** All types excluding `Load`. */
	All: ((1 << 10) - 1) & ~(1 << 0),
};
EntityChangeType.Hierarchy = EntityChangeType.Create | EntityChangeType.Delete | EntityChangeType.Rename | EntityChangeType.Rearrange;
EntityChangeType.Component = EntityChangeType.CreateComponent | EntityChangeType.DeleteComponent | EntityChangeType.RearrangeComponent | EntityChangeType.ComponentProperty;

/**
 * @typedef OnTrackedEntityChangeEvent
 * @property {Entity} entity The entity that was changed.
 * @property {number} type
 */
/** @typedef {(event: OnTrackedEntityChangeEvent) => void} OnTrackedEntityChangeCallback */

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

	/** @type {EventHandler<Entity, OnTrackedEntityChangeEvent>} */
	#onTrackedEntityChangeHandler = new EventHandler();

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
			this.#applyEntityClone(trackedData.sourceEntity, entity, EntityChangeType.Load | EntityChangeType.All);
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
		this.updateEntity(sourceEntity, EntityChangeType.Load | EntityChangeType.All);
	}

	/**
	 * @param {Entity} entity
	 */
	#findRootEntityAsset(entity) {
		/** @type {number[]} */
		const indicesPath = [];
		for (const parent of entity.traverseUp()) {
			const uuid = this.getLinkedAssetUuid(parent);
			if (!uuid) {
				const parentParent = parent.parent;
				if (!parentParent) {
					// No entity asset was found in the parent chain
					// we'll break out of the loop and throw below
					break;
				}
				indicesPath.unshift(parentParent.children.indexOf(parent));
			} else {
				return {
					root: parent,
					indicesPath,
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
	 * @param {EntityChangeType} changeEventType
	 */
	updateEntity(entityInstance, changeEventType) {
		const {uuid, root} = this.#findRootEntityAsset(entityInstance);
		const trackedData = this.#trackedEntities.get(uuid);
		if (!trackedData) {
			throw new Error("The provided entity asset is not tracked by this EntityAssetManager.");
		}

		if (root != trackedData.sourceEntity) {
			if (!trackedData.sourceEntity) {
				throw new Error("The source entity has not been loaded yet");
			}
			this.#applyEntityClone(root, trackedData.sourceEntity, changeEventType);
		}
		for (const trackedEntity of trackedData.trackedInstances) {
			if (trackedEntity == root) continue;
			this.#applyEntityClone(root, trackedEntity, changeEventType);
		}
	}

	/**
	 * @param {Entity} sourceEntity
	 * @param {Entity} targetEntity
	 * @param {EntityChangeType} changeEventType
	 */
	#applyEntityClone(sourceEntity, targetEntity, changeEventType) {
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

		this.#onTrackedEntityChangeHandler.fireEvent(targetEntity, {
			entity: targetEntity,
			type: changeEventType,
		});
	}

	/**
	 * Calling this after making a change to an entity will cause all other
	 * instances to get updated with the new transformation of your provided instance.
	 * @param {Entity} entityInstance The entity for which the transformation was changed.
	 */
	updateEntityPosition(entityInstance) {
		const {uuid, indicesPath, root} = this.#findRootEntityAsset(entityInstance);
		const trackedData = this.#trackedEntities.get(uuid);
		if (!trackedData) {
			throw new Error("The provided entity asset is not tracked by this EntityAssetManager.");
		}

		for (const trackedEntity of trackedData.trackedInstances) {
			if (trackedEntity == root) continue;
			this.#applyEntityPosition(root, trackedEntity, indicesPath);
		}
	}

	/**
	 * @param {Entity} sourceEntity
	 * @param {Entity} targetEntity
	 * @param {number[]} indicesPath
	 */
	#applyEntityPosition(sourceEntity, targetEntity, indicesPath) {
		const sourceChild = sourceEntity.getEntityByIndicesPath(indicesPath);
		const targetChild = targetEntity.getEntityByIndicesPath(indicesPath);
		if (!sourceChild || !targetChild) throw new Error("Assertion failed, source or target entity not found");

		targetChild.localMatrix = sourceChild.localMatrix;

		this.#onTrackedEntityChangeHandler.fireEvent(targetEntity, {
			entity: targetChild,
			type: EntityChangeType.Transform,
		});
	}

	/**
	 * Registers a callback that fires when an entity or any of its children changes.
	 * Events are only fired on the immediate root asset. Meaning that if an entity asset A
	 * contains another entity asset B, and a child of B changes,
	 * events only fire when registered with the reference of entity asset B.
	 *
	 * Listeners are weakly held and garbage collected when the entity reference is garbage collected.
	 *
	 * @param {Entity} entityReference
	 * @param {OnTrackedEntityChangeCallback} cb
	 */
	onTrackedEntityChange(entityReference, cb) {
		this.#onTrackedEntityChangeHandler.addEventListener(entityReference, cb);
	}

	/**
	 * @param {Entity} assetReference
	 * @param {OnTrackedEntityChangeCallback} cb
	 */
	removeOnTrackedEntityChange(assetReference, cb) {
		this.#onTrackedEntityChangeHandler.removeEventListener(assetReference, cb);
	}
}
