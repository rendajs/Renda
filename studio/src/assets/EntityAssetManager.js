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
 * @property {Entity} sourceEntity A reference to the source entity that was changed and caused other tracked entities to get updated.
 * This is not a direct child of the entityReference that you called `onTrackedEntityChange` with.
 * Instead, this is the source entity that was copied and applied onto `targetEntity`.
 * So you'll likely want to use `targetEntity` instead.
 * @property {Entity} targetEntity The entity that was changed. This is either a direct child of the entityReference that you called `onTrackedEntityChange` with,
 * or the entityReference itself.
 * @property {number} type
 * @property {unknown} source The source that caused the event to fire. This is typically a reference to a content window.
 * This can be used to compare the source against the current content window and ignore events that were triggered by itself.
 * For instance, inside your event handler you can do `if (e.source == this) return` to ignore all events triggered from the current class.
 * In order for this to work, you'll need to use `updateEntity(entity, EntityChangeType, this);` with `this` as `source` parameter for all `updateEntity` calls in the current class.
 *
 * Another option is to check if `e.sourceEntity == e.targetEntity`. There's a difference between the two approaches.
 * `e.source` generally tells you which content window caused the change, whereas `e.sourceEntity` tells you *which* tracked entity was changed.
 * When in doubt, you'll likely want to use the `if (e.source == this) return` approach.
 *
 * To give a few examples:
 * The outliner might want to ignore all changes made by itself to prevent interfering with user input.
 * But it will still want to update ui when changes are made from its linked entity editor.
 * (The entity editor and outliner both reference the same tracked entity instance.)
 * In this case the outliner will want to use `if (e.source == this) return` to ignore all events from its own window.
 *
 * But on the other hand, an entity editor might not want to save any changes made from other entity editors.
 * But it will still want to save changes made from the outliner.
 * (Two entity editors both reference two different tracked entity instances.)
 * In this case, the entity editor will want to use `e.sourceEntity == e.targetEntity` to only trigger a save when
 * its own entity was modified.
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

	/** @typedef {Entity & Partial<{[x: symbol]: import("../../../src/mod.js").UuidString}>} EntityWithUuidSymbol */

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
	 * {@linkcode updateEntity} or {@linkcode updateEntityTransform} after making your change.
	 *
	 * The entity structure will be completely rebuilt when a change occurs.
	 * So if you hold references to children of the tracked entity, these references might become useless when something changes.
	 * Because children of the tracked entity could get replaced at any time,
	 * the reference you hold might be pointing to an entity that is no longer being used.
	 * You can listen for changes with {@linkcode onTrackedEntityChange} and update your references when this happens.
	 * The only exception to this is changes to the position, rotation, or scale of entities.
	 * In that case the changes will be applied to the existing entities directly.
	 *
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 */
	createTrackedEntity(uuid) {
		const entity = new Entity();
		this.#trackEntityAndLoad(uuid, entity, false);
		return entity;
	}

	/**
	 * Turns an existing entity into a tracked one.
	 * Overwrites other instances of this uuid with the provided entity.
	 *
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 * @param {Entity} entity
	 */
	replaceTrackedEntity(uuid, entity) {
		this.#trackEntityAndLoad(uuid, entity, true);
		if (entity.parent) {
			this.updateEntity(entity.parent, EntityChangeType.Delete | EntityChangeType.Create, null);
		}
	}

	/**
	 * Gets the uuid of the asset that the entity is an instance of, if any.
	 * @param {Entity} entity
	 */
	getLinkedAssetUuid(entity) {
		const castEntity = /** @type {EntityWithUuidSymbol} */ (entity);
		return castEntity[this.#entityAssetRootUuidSymbol] || null;
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
	 * @param {boolean} overwriteLoaded Controls which entity is applied to which instance.
	 * - Set to true to apply the instance of the `entity` parameter onto all the existing instances.
	 * - Set to false to discard the state of the `entity` parameter and apply what is currently loaded instead.
	 */
	#trackEntityAndLoad(uuid, entity, overwriteLoaded) {
		let trackedData = this.#trackedEntities.get(uuid);
		if (!trackedData) {
			trackedData = {
				sourceEntity: null,
				trackedInstances: new IterableWeakSet(),
			};
			this.#trackedEntities.set(uuid, trackedData);
			(async () => {
				if (trackedData.sourceEntity) throw new Error("Source entity is already loaded");
				const sourceEntity = await this.#assetManager.getLiveAsset(uuid, {
					assertAssetType: ProjectAssetTypeEntity,
					assertExists: true,
				});
				trackedData.sourceEntity = sourceEntity;
				if (overwriteLoaded) {
					this.updateEntity(entity, EntityChangeType.All, null);
				} else {
					this.updateEntity(sourceEntity, EntityChangeType.Load | EntityChangeType.All, null);
				}
			})();
		}
		trackedData.trackedInstances.add(entity);
		this.setLinkedAssetUuid(entity, uuid);
		if (overwriteLoaded) {
			if (trackedData.sourceEntity) {
				this.updateEntity(entity, EntityChangeType.All, null);
			}
		} else {
			if (trackedData.sourceEntity) {
				this.#applyEntityClone(trackedData.sourceEntity, entity, EntityChangeType.Load | EntityChangeType.All, null);
			}
		}
	}

	/**
	 * Gets the first parent that is a linked entity asset.
	 * Also includes an indicesPath to walk from the linked entity asset to the provided child.
	 * @param {Entity} entity
	 */
	findRootEntityAsset(entity) {
		/** @type {number[]} */
		const indicesPath = [];
		for (const parent of entity.traverseUp()) {
			const uuid = this.getLinkedAssetUuid(parent);
			if (!uuid) {
				const parentParent = parent.parent;
				if (!parentParent) {
					// No entity asset was found in the parent chain
					// we'll break out of the loop and return below
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
		return null;
	}

	/**
	 * Calling this after making a change to an entity will cause all other
	 * instances to get updated with the new state of your provided instance.
	 * This **clones** the entire entity for every instance that exists, which can be a fairly heavy operation.
	 * If the only thing you did was change the position, rotation or scale of an entity,
	 * it's best to use {@linkcode updateEntityTransform} instead.
	 *
	 * Note that changes using `EntityChangeType.Create` and `EntityChangeType.Delete` should fire on
	 * the parent on which the entity was added or removed.
	 * @param {Entity} entityInstance
	 * @param {EntityChangeType} changeEventType
	 * @param {unknown} eventSource This is typically an instance to the content window that fired the event.
	 * This can be used to compare the source against the current content window and ignore events that were triggered by itself.
	 */
	updateEntity(entityInstance, changeEventType, eventSource) {
		console.log("updateEntity()", changeEventType);
		const rootData = this.findRootEntityAsset(entityInstance);
		if (rootData) {
			console.log("rootData found");
			const {uuid, root, indicesPath} = rootData;
			const trackedData = this.#trackedEntities.get(uuid);
			if (trackedData) {
				console.log("trackedData found");
				const sourceEntity = root.getEntityByIndicesPath(indicesPath);
				if (!sourceEntity) throw new Error("Assertion failed: Source child entity was not found");
				console.log("sourceEntity found");
				if (root != trackedData.sourceEntity) {
					console.log("root != source");
					if (!trackedData.sourceEntity) {
						throw new Error("The source entity has not been loaded yet");
					}
					const targetEntity = trackedData.sourceEntity.getEntityByIndicesPath(indicesPath);
					if (!targetEntity) throw new Error("Assertion failed: Target child entity was not found");
					console.log("applying clone1");
					this.#applyEntityClone(sourceEntity, targetEntity, changeEventType, eventSource);
				}
				for (const trackedEntity of trackedData.trackedInstances) {
					console.log("looping of tracked instance");
					if (trackedEntity == root) continue;
					console.log("it's not the root");
					const targetEntity = trackedEntity.getEntityByIndicesPath(indicesPath);
					if (!targetEntity) throw new Error("Assertion failed: Target child entity was not found");
					console.log("applying clone2");
					this.#applyEntityClone(sourceEntity, targetEntity, changeEventType, eventSource);
				}
			}
		}
		this.#fireEvent(entityInstance, entityInstance, changeEventType, eventSource);
		console.log("entity child count", entityInstance.childCount);
	}

	/**
	 * Makes sure `targetEntity` becomes exactly the same as `sourceEntity`.
	 * The name and components of the root (i.e `targetEntity`) will only be modified,
	 * but all of its children will be cloned entirely.
	 *
	 * @param {Entity} sourceEntity The entity to clone
	 * @param {Entity} targetEntity The target entity to apply the source entity to
	 * @param {EntityChangeType} changeEventType
	 * @param {unknown} source
	 */
	#applyEntityClone(sourceEntity, targetEntity, changeEventType, source) {
		console.log("applyEntityClone", sourceEntity.childCount, targetEntity.childCount);
		targetEntity.name = sourceEntity.name;
		targetEntity.localMatrix = sourceEntity.localMatrix;

		// We don't want to clone any nested entity assets, since they will be kept in sync by their own change events.
		// But we also don't want to create new tracked entities for every nested entity either.
		// Instead we'll collect all existing nested (tracked) entities so that we can add them in the `cloneChildHook` later.
		/** @type {Map<import("../../../src/mod.js").UuidString, Entity[]>} */
		const existingTrackedEntities = new Map();
		for (const child of targetEntity.traverseDown()) {
			if (child == targetEntity) continue;
			const uuid = this.getLinkedAssetUuid(child);
			if (!uuid) continue;
			let entities = existingTrackedEntities.get(uuid);
			if (!entities) {
				entities = [];
				existingTrackedEntities.set(uuid, entities);
			}
			entities.push(child);
		}
		for (const entities of existingTrackedEntities.values()) {
			for (const entity of entities) {
				if (entity.parent) {
					entity.parent.remove(entity);
				}
			}
		}

		while (targetEntity.childCount > 0) {
			targetEntity.remove(targetEntity.children[0]);
		}

		/**
		 * Gets an existing tracked entity if one is available, and creates one otherwise.
		 * @param {import("../../../src/mod.js").UuidString} uuid
		 */
		const getTrackedEntity = uuid => {
			const entities = existingTrackedEntities.get(uuid);
			if (entities) {
				const entity = entities.pop();
				if (entity) return entity;
			}
			return this.createTrackedEntity(uuid);
		};

		for (const child of sourceEntity.children) {
			const clone = child.clone({
				cloneChildHook: ({child}) => {
					const uuid = this.getLinkedAssetUuid(child);
					if (uuid) {
						return getTrackedEntity(uuid);
					} else {
						// Perform regular clone behaviour
						return null;
					}
				},
			});
			targetEntity.add(clone);
			clone.localMatrix = child.localMatrix;
		}

		while (targetEntity.components.length > 0) {
			targetEntity.removeComponent(targetEntity.components[0]);
		}
		for (const component of sourceEntity.components) {
			targetEntity.addComponent(component.clone());
		}

		this.#fireEvent(sourceEntity, targetEntity, changeEventType, source);
		console.log("done applyEntityClone", sourceEntity.childCount, targetEntity.childCount);
	}

	/**
	 * Calling this after making a change to an entity will cause all other
	 * instances to get updated with the new transformation of your provided instance.
	 *
	 * @param {Entity} entityInstance The entity for which the transformation was changed.
	 * @param {unknown} eventSource This is typically an instance to the content window that fired the event.
	 * This can be used to compare the source against the current content window and ignore events that were triggered by itself.
	 */
	updateEntityTransform(entityInstance, eventSource) {
		const rootData = this.findRootEntityAsset(entityInstance);
		if (rootData) {
			const {uuid, indicesPath, root} = rootData;
			const trackedData = this.#trackedEntities.get(uuid);
			if (trackedData) {
				const sourceChild = root.getEntityByIndicesPath(indicesPath);
				if (!sourceChild) throw new Error("Assertion failed, source entity not found");
				for (const trackedEntity of trackedData.trackedInstances) {
					if (trackedEntity == root) continue;
					this.#applyEntityTransform(sourceChild, trackedEntity, indicesPath, eventSource);
				}

				if (trackedData.sourceEntity) {
					this.#applyEntityTransform(sourceChild, trackedData.sourceEntity, indicesPath, eventSource);
				}
			}
		}
		this.#fireEvent(entityInstance, entityInstance, EntityChangeType.Transform, eventSource);
	}

	/**
	 * @param {Entity} sourceChild
	 * @param {Entity} targetEntity
	 * @param {number[]} indicesPath
	 * @param {unknown} eventSource
	 */
	#applyEntityTransform(sourceChild, targetEntity, indicesPath, eventSource) {
		const targetChild = targetEntity.getEntityByIndicesPath(indicesPath);
		if (!targetChild) throw new Error("Assertion failed, target entity not found");

		targetChild.localMatrix = sourceChild.localMatrix;

		this.#fireEvent(sourceChild, targetChild, EntityChangeType.Transform, eventSource);
	}

	/**
	 * Traverses up the parent tree and fires events on every parent.
	 * @param {Entity} sourceEntity
	 * @param {Entity} targetEntity
	 * @param {EntityChangeType} type
	 * @param {unknown} eventSource
	 */
	#fireEvent(sourceEntity, targetEntity, type, eventSource) {
		for (const parent of targetEntity.traverseUp()) {
			this.#onTrackedEntityChangeHandler.fireEvent(parent, {
				targetEntity,
				sourceEntity,
				type,
				source: eventSource,
			});
		}
	}

	/**
	 * Registers a callback that fires when an entity or any of its children changes.
	 * Events are also fired on child entity assets. Meaning that if an entity 'asset A'
	 * contains another entity 'asset B', and a child of B changes,
	 * events fire on both asset A as well as B, including all of their children.
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
	 * @param {Entity} entityReference
	 * @param {OnTrackedEntityChangeCallback} cb
	 */
	removeOnTrackedEntityChange(entityReference, cb) {
		this.#onTrackedEntityChangeHandler.removeEventListener(entityReference, cb);
	}
}
