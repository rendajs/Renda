import {Mat4} from "../math/Mat4.js";
import {Quat} from "../math/Quat.js";
import {Vec3} from "../math/Vec3.js";
import {Component} from "../components/Component.js";
import {ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT} from "../studioDefines.js";
import {ComponentTypeManager} from "../components/ComponentTypeManager.js";

/**
 * @typedef {object} CreateEntityOptions
 * @property {string} [name = "Entity"]
 * @property {import("../math/Mat4.js").Mat4?} [localMatrix = null]
 * @property {import("../math/Mat4.js").Mat4?} [worldMatrix = null]
 * @property {Entity?} [parent = null]
 */

/**
 * @typedef EntityTraverseOptions
 * @property {((entity: Entity) => boolean)?} [filter] A filter function that you can use
 * to exclude certain parts of the tree. If the function returns false, that child and all of
 * its children will be excluded from the traversal.
 */

/**
 * @typedef {object} EntityJsonDataBase
 * @property {string} [name]
 */

/**
 * @typedef {object} EntityJsonDataInlineEntityTypes
 * @property {number[]} [matrix]
 * @property {import("../components/Component.js").EntityJsonDataComponent[]} [components]
 * @property {EntityJsonData[]} [children]
 */
/**
 * @typedef {EntityJsonDataBase & EntityJsonDataInlineEntityTypes} EntityJsonDataInlineEntity
 */

/**
 * @typedef {object} EntityJsonDataAssetEntityTypes
 * @property {import("../util/util.js").UuidString} assetUuid
 * @property {number[]} [pos]
 * @property {number[]} [rot]
 * @property {number[]} [scale]
 */
/**
 * @typedef {EntityJsonDataBase & EntityJsonDataAssetEntityTypes} EntityJsonDataAssetEntity
 */

/** @typedef {EntityJsonDataInlineEntity | EntityJsonDataAssetEntity} EntityJsonData */

/**
 * @typedef {object} EntityToJsonOptions
 * @property {import("../../studio/src/assets/AssetManager.js").AssetManager} assetManager
 * @property {import("../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {(entity: Entity) => import("../mod.js").UuidString?} getLinkedAssetUuid
 */

/**
 * @typedef CloneChildHookData
 * @property {Entity} child The original child of the entity that needs to be cloned.
 * You may return this directly to add the child without cloning, but note that this will cause it to get removed from the original entity.
 * @property {EntityCloneOptions} options The options that were passed to the {@linkcode Entity.clone} call.
 * You can use this to pass on the options to subsequent clone calls.
 */

/**
 * @typedef EntityCloneOptions
 * @property {(hookData: CloneChildHookData) => (Entity | null | void | false)} [cloneChildHook] Hook that
 * gets called every time a child needs to be cloned. The entity that is used depends on what is returned by the hook:
 *
 * - Returning an entity will add that entity as child directly without any modifications.
 * - `null` or `undefined` will clone the existing child and apply it.
 * - `false` will remove the child from the entity. Note that this causes siblings to receive a different index in the `children` array.
 */

export class Entity {
	/**
	 * @param {CreateEntityOptions | string} options
	 */
	constructor(options = {}) {
		if (typeof options == "string") {
			options = {
				name: options,
			};
		}
		/** @type {Required<CreateEntityOptions>} */
		const opts = {
			...{
				name: "Entity",
				localMatrix: null,
				worldMatrix: null,
				parent: null,
			}, ...options,
		};
		/** @type {string} */
		this.name = opts.name;
		/** @type {Entity?} */
		this._parent = null;
		/** @type {Entity[]} */
		this._children = [];
		/** @type {Component[]} */
		this.components = [];

		/** @private */
		this._localMatrix = new Mat4();
		this._localMatrix.onChange(this._onLocalMatrixChange.bind(this));
		/**
		 * We listen for local matrix changes to update the position, rotation, scale and worldMatrix accordingly.
		 * But sometimes we need to set the local matrix internally, which would otherwise cause a feedback loop.
		 * @private
		 */
		this._ignoreLocalMatrixChanges = false;

		/** @private */
		this.worldMatrixDirty = false;
		/** @private */
		this._worldMatrix = new Mat4();
		this._worldMatrix.onChange(this._onWorldMatrixChange.bind(this));
		/**
		 * We listen for world matrix changes to update the position, rotation, scale and localMatrix accordingly.
		 * But sometimes we need to set the local matrix internally, which would otherwise cause a feedback loop.
		 * @private
		 */
		this._ignoreWorldMatrixChanges = false;

		/**
		 * True when the position, rotation, or scale have been set and the local matrix
		 * needs to be updated the first time it is queried.
		 * @private
		 */
		this._localMatrixDirty = false;

		/**
		 * True when a local or world matrix have been changed and the world position, rotation or scale
		 * need to be updated the first time they are queried.
		 * @private
		 */
		this._worldPosRotScaleDirty = false;

		const boundOnPosRotScaleChanged = this._onPosRotScaleChanged.bind(this);
		/** @private */
		this._pos = new Vec3();
		this._pos.onChange(boundOnPosRotScaleChanged);
		/** @private */
		this._rot = new Quat();
		this._rot.onChange(boundOnPosRotScaleChanged);
		/** @private */
		this._scale = Vec3.one;
		this._scale.onChange(boundOnPosRotScaleChanged);

		/**
		 * We listen for changes on the world vectors and quaternions, because
		 * in case the user makes a change, we want to update the matrix and
		 * local transformation values. However, some of our own code adjusts
		 * these values as well, in that case we will temporarily set this flag
		 * to ignore these events.
		 * @private
		 */
		this._ignoreWorldChanges = false;

		/** @private */
		this._worldPos = new Vec3();
		this._worldPos.onChange(this.onWorldPosChange.bind(this));

		/** @private */
		this._worldRot = new Quat();
		this._worldRot.onChange(this.onWorldRotChange.bind(this));

		/** @private */
		this._worldScale = new Vec3();
		this._worldScale.onChange(this.onWorldScaleChange.bind(this));

		if (opts.localMatrix && opts.worldMatrix) {
			throw new Error("Both a localMatrix and worldMatrix option was provided which is not supported.");
		}

		if (opts.localMatrix) this.localMatrix = opts.localMatrix;
		if (opts.parent) {
			opts.parent.add(this);
		}
		if (opts.worldMatrix) this.worldMatrix = opts.worldMatrix;

		/**
		 * @typedef {<C extends Component, A extends ConstructorParameters<typeof Component>>(componentConstructor: new (...args: A) => C, ...args: A) => C} addComponentConstructorSignature
		 * @typedef {<T extends Component>(componentInstance: T) => T} addComponentInstanceSignature
		 * @typedef {(componentTypeManager: ComponentTypeManager, componentUuid: string, ...rest: ConstructorParameters<typeof Component>) => Component} addComponentUuidSignature
		 */

		/** @type {addComponentConstructorSignature & addComponentInstanceSignature & addComponentUuidSignature} */
		this.addComponent = (/** @type {any} */ ...args) => {
			return this._addComponent(...args);
		};
	}

	destructor() {
		// todo: completely remove destructors?
		for (const child of this._children) {
			child.destructor();
		}
		this._children = [];
		for (const component of this.components) {
			component.destructor();
		}

		// todo: remove transformation listeners from rot pos scale etc
	}

	/**
	 * @param {...any} args
	 * @returns {*}
	 */
	_addComponent(...args) {
		const firstArg = /** @type {*} */ (args[0]);
		/** @type {Component} */
		let component;
		if (firstArg instanceof Component) {
			component = firstArg;
		} else {
			let ComponentConstructor = null;
			if (firstArg instanceof ComponentTypeManager) {
				ComponentConstructor = firstArg.getComponentConstructorForUuid(args[1]);
				if (!ComponentConstructor) {
					throw new Error("Component uuid not found, make sure it registered with the ComponentTypeManager.");
				}
			} else if (firstArg.prototype instanceof Component) {
				ComponentConstructor = firstArg;
			}

			const [, ...restArgs] = args;
			component = new ComponentConstructor(...restArgs);
		}

		if (!this.components.includes(component)) {
			this.components.push(component);
			this._componentAttachedToEntity(component, this);
		}
		return component;
	}

	/**
	 * @param {Component} component
	 */
	removeComponent(component) {
		this.components.splice(this.components.indexOf(component), 1);
		this._componentAttachedToEntity(component, null, false);
	}

	/**
	 * @private
	 * @param {Component} component
	 * @param {Entity?} entity
	 * @param {boolean} callRemoveComponent
	 */
	_componentAttachedToEntity(component, entity, callRemoveComponent = true) {
		if (component.entity == entity) return;
		if (component.entity && callRemoveComponent) {
			component.entity.removeComponent(component);
		}
		component.entity = entity;
	}

	// #if !_IS_CLOSURE_BUILD
	/**
	 * @template {Component} T
	 * @param {new () => T} componentConstructor
	 * @returns {T?}
	 */
	// #endif
	getComponent(componentConstructor) {
		for (const component of this.getComponents(componentConstructor)) {
			return component;
		}
		return null;
	}

	// #if !_IS_CLOSURE_BUILD
	/**
	 * Yields all components of the given type non recursively.
	 * @template {Component} T
	 * @param {new () => T} componentConstructor
	 * @returns {Generator<T>}
	 */
	// #endif
	*getComponents(componentConstructor) {
		for (const component of this.components) {
			if (component instanceof componentConstructor) {
				yield component;
			}
		}
	}

	// #if !_IS_CLOSURE_BUILD
	/**
	 * Yields all components of the given type from this entity and all its children.
	 * @template {Component} T
	 * @param {new () => T} componentConstructor
	 * @returns {Generator<T>}
	 */
	// #endif
	*getChildComponents(componentConstructor) {
		for (const child of this.traverseDown()) {
			for (const component of child.getComponents(componentConstructor)) {
				yield component;
			}
		}
	}

	get parent() {
		return this._parent;
	}

	set parent(parent) {
		this.setParentInternal(parent);
	}

	/**
	 * Changes the current parent of this entity. If there is already a parent,
	 * this will make sure it gets removed from that parent properly.
	 *
	 * @private
	 * @param {Entity?} newParent
	 */
	setParentInternal(newParent, keepWorldPosition = false, addChild = true) {
		if (this._parent == newParent && addChild) return;

		if (this._parent) {
			this._parent.remove(this);
		}
		this._parent = newParent;
		this._markWorldMatrixDirty();
		if (newParent && addChild) {
			newParent.add(this);
		}
	}

	get isRoot() {
		return !this.parent;
	}

	/**
	 * @returns {Vec3}
	 */
	get pos() {
		return this._pos;
	}

	/**
	 * @param {import("../math/Vec3.js").Vec3ParameterSingle} value
	 */
	set pos(value) {
		this._pos.set(value);
	}

	/**
	 * @returns {Quat}
	 */
	get rot() {
		return this._rot;
	}

	/**
	 * @param {import("../math/Quat.js").QuatParameterSingle} value
	 */
	set rot(value) {
		this._rot.set(value);
	}

	/**
	 * @returns {Vec3}
	 */
	get scale() {
		return this._scale;
	}

	/**
	 * @param {import("../math/Vec3.js").Vec3ParameterSingle} value
	 */
	set scale(value) {
		this._scale.set(value);
	}

	/**
	 * @returns {Vec3}
	 */
	get worldPos() {
		this.updateWorldPosRotScaleIfDirty();
		return this._worldPos;
	}

	/**
	 * @param {import("../math/Vec3.js").Vec3ParameterSingle} value
	 */
	set worldPos(value) {
		this.updateWorldPosRotScaleIfDirty();
		this._worldPos.set(value);
	}

	/**
	 * @returns {Quat}
	 */
	get worldRot() {
		this.updateWorldPosRotScaleIfDirty();
		return this._worldRot;
	}

	/**
	 * @param {import("../math/Quat.js").QuatParameterSingle} value
	 */
	set worldRot(value) {
		this.updateWorldPosRotScaleIfDirty();
		this._worldRot.set(value);
	}

	/**
	 * @returns {Vec3}
	 */
	get worldScale() {
		this.updateWorldPosRotScaleIfDirty();
		return this._worldScale;
	}

	/**
	 * @param {import("../math/Vec3.js").Vec3ParameterSingle} value
	 */
	set worldScale(value) {
		this.updateWorldPosRotScaleIfDirty();
		this._worldScale.set(value);
	}

	get localMatrix() {
		if (this._localMatrixDirty) {
			const pos = this.pos;
			const rot = this.rot;
			const scale = this.scale;
			const newMatrix = Mat4.createPosRotScale(pos, rot, scale);
			this._ignoreLocalMatrixChanges = true;
			this._localMatrix.set(newMatrix);
			this._ignoreLocalMatrixChanges = false;
			this._localMatrixDirty = false;
		}
		return this._localMatrix;
	}

	set localMatrix(value) {
		this._localMatrix.set(value);
	}

	/**
	 * @private
	 */
	_onLocalMatrixChange() {
		if (this._ignoreLocalMatrixChanges) return;
		const {pos, rot, scale} = this._localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
		this._localMatrixDirty = false;

		// Mat4.decompose() doesn't extract negative scales correctly right now.
		// Because of this, it's possible for the world matrix of children not
		// to get marked as dirty when the scale changes from -1,-1,-1 to 1,1,1 for example.
		// To fix that, we manually mark them as dirty.
		this._markWorldMatrixDirty();
	}

	get worldMatrix() {
		this.updateWorldMatrixIfDirty();
		return this._worldMatrix;
	}

	set worldMatrix(value) {
		this._worldMatrix.set(value);
	}

	_onWorldMatrixChange() {
		if (this._ignoreWorldMatrixChanges) return;
		if (!this.parent) {
			this.localMatrix.set(this._worldMatrix);
		} else {
			const newLocalMatrix = this.parent.worldMatrix.clone().invert().multiplyMatrix(this._worldMatrix);
			this.localMatrix.set(newLocalMatrix);
		}
	}

	/**
	 * Marks the local matrix as dirty on this entity and the world matrix of all it's children.
	 * @private
	 */
	_onPosRotScaleChanged() {
		this._localMatrixDirty = true;
		this._markWorldMatrixDirty();
	}

	/**
	 * Marks the world matrix of this entity and all its children as dirty.
	 * @private
	 */
	_markWorldMatrixDirty() {
		this.worldMatrixDirty = true;
		for (const child of this.traverseDown()) {
			child.worldMatrixDirty = true;
		}
	}

	/**
	 * Updates the world matrix as well as the world position, rotation and
	 * scale of this entity.
	 * @private
	 */
	updateWorldMatrixIfDirty() {
		if (this._localMatrixDirty || this.worldMatrixDirty) {
			let newMatrix;
			if (this.parent) {
				newMatrix = Mat4.multiplyMatrices(this.localMatrix, this.parent.worldMatrix);
			} else {
				newMatrix = this.localMatrix.clone();
			}
			this._ignoreWorldMatrixChanges = true;
			this._worldMatrix.set(newMatrix);
			this._ignoreWorldMatrixChanges = false;
			this.worldMatrixDirty = false;
			this._worldPosRotScaleDirty = true;
		}
	}

	/**
	 * @private
	 */
	updateWorldPosRotScaleIfDirty() {
		this.updateWorldMatrixIfDirty();
		if (!this._worldPosRotScaleDirty) return;
		const {pos, rot, scale} = this._worldMatrix.decompose();
		this._ignoreWorldChanges = true;
		this._worldPos.set(pos);
		this._worldRot.set(rot);
		this._worldScale.set(scale);
		this._ignoreWorldChanges = false;
		this._worldPosRotScaleDirty = false;
	}

	/**
	 * @private
	 * @param {number} changedComponents
	 */
	onWorldPosChange(changedComponents) {
		if (this._ignoreWorldChanges) return;
		let pos;

		if (changedComponents == 0x111) {
			pos = this._worldPos.clone();
		} else {
			// The current world position might be old, so if only a single
			// component has changed, we want to update the world pos rot and
			// scale and only use the changed component.
			const desiredWorldPos = this._worldPos.clone();
			this.updateWorldPosRotScaleIfDirty();
			pos = this._worldPos.clone();

			if (changedComponents & 0x100) {
				pos.x = desiredWorldPos.x;
			}
			if (changedComponents & 0x010) {
				pos.y = desiredWorldPos.y;
			}
			if (changedComponents & 0x001) {
				pos.z = desiredWorldPos.z;
			}
		}

		if (this.parent) {
			const parentMat = this.parent.worldMatrix.inverse();
			pos.multiply(parentMat);
		}
		this.pos = pos;
	}

	/**
	 * @private
	 * @param {number} changedComponents
	 */
	onWorldRotChange(changedComponents) {
		if (this._ignoreWorldChanges) return;
		let rot;

		if (changedComponents == 0x1111) {
			rot = this._worldRot.clone();
		} else {
			// The current world rotation might be old, so if only a single
			// component has changed, we want to update the world pos rot and
			// scale and only use the changed component.
			const desiredWorldRot = this._worldRot.clone();
			this.updateWorldPosRotScaleIfDirty();
			rot = this._worldRot.clone();

			if (changedComponents & 0x1000) {
				rot.x = desiredWorldRot.x;
			}
			if (changedComponents & 0x0100) {
				rot.y = desiredWorldRot.y;
			}
			if (changedComponents & 0x0010) {
				rot.z = desiredWorldRot.z;
			}
			if (changedComponents & 0x0001) {
				rot.w = desiredWorldRot.w;
			}
		}

		if (this.parent) {
			const parentMat = this.parent.worldMatrix.inverse();
			rot.preMultiply(parentMat.getRotation());
		}
		this.rot = rot;
	}

	/**
	 * @private
	 * @param {number} changedComponents
	 */
	onWorldScaleChange(changedComponents) {
		if (this._ignoreWorldChanges) return;
		let scale;

		if (changedComponents == 0x111) {
			scale = this._worldScale.clone();
		} else {
			// The current world scale might be old, so if only a single
			// component has changed, we want to update the world pos rot and
			// scale and only use the changed component.
			const desiredWorldScale = this._worldScale.clone();
			this.updateWorldPosRotScaleIfDirty();
			scale = this._worldScale.clone();

			if (changedComponents & 0x100) {
				scale.x = desiredWorldScale.x;
			}
			if (changedComponents & 0x010) {
				scale.y = desiredWorldScale.y;
			}
			if (changedComponents & 0x001) {
				scale.z = desiredWorldScale.z;
			}
		}

		if (this.parent) {
			const parentMat = this.parent.worldMatrix.inverse();
			const parentScale = parentMat.getScale();
			scale.multiply(parentScale);
		}
		this.scale = scale;
	}

	/**
	 * Adds an entity as child of this one.
	 * @param {Entity} child
	 * @param {boolean} keepWorldPosition
	 */
	add(child, keepWorldPosition = false) {
		return this.addAtIndex(child, -1, keepWorldPosition);
	}

	/**
	 * Adds an entity as child of this one at a specific index.
	 * Negative values count back from the last item in the children array.
	 * I.e. an index of -1 will insert the child at the very end of the array.
	 * @param {Entity} child
	 * @param {number} index
	 * @param {boolean} keepWorldPosition
	 */
	addAtIndex(child, index, keepWorldPosition = false) {
		if (index < 0) {
			index = this._children.length + index + 1;
		}
		child.setParentInternal(this, keepWorldPosition, false);
		if (index >= this._children.length) {
			this._children.push(child);
		} else {
			this._children.splice(index, 0, child);
		}
		return child;
	}

	/**
	 * Removes a child from this entity.
	 * @param {Entity} child
	 */
	remove(child) {
		for (const [i, c] of this._children.entries()) {
			if (c == child) {
				this.removeAtIndex(i);
				return;
			}
		}
	}

	/**
	 * Removes a child at a specific index from this entity.
	 * @param {number} index
	 */
	removeAtIndex(index) {
		const child = this._children[index];
		// eslint-disable-next-line no-underscore-dangle
		child._parent = null;
		this._children.splice(index, 1);
	}

	/**
	 * Removes the parent from this entity and this child from the parent.
	 */
	detachParent() {
		this.parent = null;
	}

	*getChildren() {
		for (const child of this._children) {
			yield child;
		}
	}

	get children() {
		return Array.from(this.getChildren());
	}

	get childCount() {
		return this._children.length;
	}

	getRoot() {
		/** @type {Entity} */
		let lastParent = this;
		while (true) {
			if (lastParent.parent) {
				lastParent = lastParent.parent;
			} else {
				break;
			}
		}
		return lastParent;
	}

	/**
	 * Yields all children recursively, including this entity itself.
	 *
	 * ```js
	 * for (const child of entity.traverseDown()) {
	 * 	// do something with the child
	 * }
	 * ```
	 *
	 * If you are dealing with a large tree of entities, you can exclude certain
	 * parts of the tree using a filter.
	 *
	 * ```js
	 * const generator = entity.traverseDown({
	 * 	filter: child => child != excludeEntity;
	 * });
	 * for (const child of generator) {
	 * 	// do something with child
	 * }
	 * ```
	 *
	 * @param {EntityTraverseOptions} options
	 * @returns {Generator<Entity>}
	 */
	*traverseDown({
		filter = null,
	} = {}) {
		if (filter && !filter(this)) return;
		yield this;
		for (const child of this._children) {
			yield* child.traverseDown({filter});
		}
	}

	/**
	 * Yields all parents recursively, including this entity itself.
	 *
	 * ```js
	 * for (const parent of entity.traverseUp()) {
	 * 	// do something with the parent
	 * }
	 * ```
	 *
	 * If you are dealing with a large tree of entities, you can exclude certain
	 * parts of the tree using a filter.
	 *
	 * ```js
	 * const generator = entity.traverseUp({
	 * 	filter: parent => parent != excludeEntity;
	 * });
	 * for (const parent of generator) {
	 * 	// do something with parent
	 * }
	 * ```
	 *
	 * @param {EntityTraverseOptions} options
	 * @returns {Generator<Entity>}
	 */
	*traverseUp({
		filter = null,
	} = {}) {
		if (filter && !filter(this)) return;
		yield this;
		if (this.parent) {
			yield* this.parent.traverseUp({filter});
		}
	}

	/**
	 * Traverses down the children of this entity and checks if it contains a specific child.
	 * Returns true if the provided entity is a child or subchild of this entity.
	 * If the entity itself is passed in, this also returns false.
	 * @param {Entity} child
	 * @returns {boolean}
	 */
	containsChild(child) {
		return child.containsParent(this);
	}

	/**
	 * Checks if this entity is the child of a specific parent.
	 * Returns true if the provided entity is a parent or ancestor of this entity.
	 * If the entity itself is passed in, this also returns false.
	 * @param {Entity} parent
	 */
	containsParent(parent) {
		if (parent == this) return false;
		for (const p of this.traverseUp()) {
			if (p == parent) return true;
		}
		return false;
	}

	/**
	 * Walks down the tree of entities, picking the children at the provided indices and returning the final child.
	 * @param {number[]} indexPath
	 * @returns {Entity?}
	 */
	getEntityByIndicesPath(indexPath, startFrom = 0) {
		if (startFrom >= indexPath.length) return this;
		const index = indexPath[startFrom];
		if (index < 0 || index > this._children.length) return null;
		const child = this.children[index];
		return child.getEntityByIndicesPath(indexPath, startFrom + 1);
	}

	/**
	 * Returns an array of numbers that represent the indices that lead to this entity.
	 * The result will be an array that can essentially be passed to {@linkcode getEntityByIndicesPath} on the root entity,
	 * which should then return this entity.
	 * @param {object} [options]
	 * @param {Entity} [options.forcedRoot] The root at which the returned array starts,
	 * when provided the indices array will start at this entity instead of the default root entity.
	 */
	getIndicesPath({forcedRoot} = {}) {
		/** @type {number[]} */
		const indices = [];
		for (const child of this.traverseUp()) {
			if (child == forcedRoot) break;
			const parent = child.parent;
			if (!parent) break;
			const index = parent.children.indexOf(child);
			if (index == -1) throw new Error("Assertion failed, entity was not a child of parent");
			indices.unshift(index);
		}
		return indices;
	}

	/**
	 * Recursively searches for an entity with the given name and returns it.
	 * @param {string} name
	 */
	getEntityByName(name) {
		for (const child of this.traverseDown()) {
			if (child.name == name) return child;
		}
		return null;
	}

	/**
	 * Clones the entity and all its children and components.
	 * The properties of the components (e.g. linked assets) are not cloned.
	 *
	 * @param {EntityCloneOptions} [options]
	 */
	clone(options = {}) {
		if (options.cloneChildHook) {
			const result = options.cloneChildHook({child: this, options});
			if (result === false) {
				throw new Error("cloneChildHook cannot return false for the root entity.");
			}
			if (result) return result;
		}
		return this._cloneInternal(options);
	}

	/**
	 * Same as {@linkcode clone} but without firing the `cloneChildHook` on the root.
	 * @private
	 * @param {EntityCloneOptions} options
	 */
	_cloneInternal(options) {
		const clone = new Entity({
			name: this.name,
			localMatrix: this.localMatrix,
		});

		for (const component of this.components) {
			clone.addComponent(component.clone());
		}

		const cloneChildHook = options.cloneChildHook || (() => null);
		for (const child of this.children) {
			let clonedChild = cloneChildHook({child, options});
			if (clonedChild === false) continue;
			if (clonedChild == null || clonedChild == undefined) {
				// eslint-disable-next-line no-underscore-dangle
				clonedChild = child._cloneInternal(options);
			}
			clone.add(clonedChild);
		}

		return clone;
	}

	/**
	 * @param {EntityToJsonOptions?} studioOpts
	 * @returns {EntityJsonData}
	 */
	toJson(studioOpts = null) {
		/** @type {EntityJsonDataInlineEntity} */
		const json = {
		};

		if (this.name) json.name = this.name;

		if (!this.localMatrix.isIdentity()) {
			json.matrix = this.localMatrix.getFlatArray();
		}

		if (this.components.length > 0) {
			json.components = [];
			for (const component of this.components) {
				json.components.push(component.toJson(studioOpts));
			}
		}

		const children = [];
		if (ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT && studioOpts && studioOpts.getLinkedAssetUuid) {
			for (const child of this.getChildren()) {
				const assetUuid = studioOpts.getLinkedAssetUuid(child);
				if (assetUuid) {
					/** @type {EntityJsonDataAssetEntity} */
					const childJson = {
						assetUuid,
					};
					children.push(childJson);
				} else {
					children.push(child.toJson(studioOpts));
				}
			}
		} else {
			for (const child of this.getChildren()) {
				children.push(child.toJson(studioOpts));
			}
		}
		if (children.length > 0) {
			json.children = children;
		}

		return json;
	}
}
