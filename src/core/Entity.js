import {Mat4} from "../math/Mat4.js";
import {Quat} from "../math/Quat.js";
import {Vec3} from "../math/Vec3.js";
import {Component} from "../components/Component.js";
import {ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT} from "../studioDefines.js";
import {ComponentTypeManager} from "../components/ComponentTypeManager.js";

/**
 * @typedef {object} CreateEntityOptions
 * @property {string} [name = "Entity"]
 * @property {import("../math/Mat4.js").Mat4?} [matrix = null]
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
 * @property {symbol} entityAssetRootUuidSymbol
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
				matrix: null,
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
		this.localMatrixDirty = false;
		/** @private */
		this._localMatrix = new Mat4();
		/** @private */
		this.worldMatrixDirty = false;
		/** @private */
		this._worldMatrix = new Mat4();

		/** @private */
		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirty.bind(this);
		/** @private */
		this._pos = new Vec3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		/** @private */
		this._rot = new Quat();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		/** @private */
		this._scale = Vec3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

		/** @private */
		this.worldPosRotScaleDirty = false;
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
		this.boundOnWorldPosChange = this.onWorldPosChange.bind(this);
		/** @private */
		this._worldPos = new Vec3();
		this._worldPos.onChange(this.boundOnWorldPosChange);

		/** @private */
		this.boundOnWorldRotChange = this.onWorldRotChange.bind(this);
		/** @private */
		this._worldRot = new Quat();
		this._worldRot.onChange(this.boundOnWorldRotChange);

		/** @private */
		this.boundOnWorldScaleChange = this.onWorldScaleChange.bind(this);
		/** @private */
		this._worldScale = new Vec3();
		this._worldScale.onChange(this.boundOnWorldScaleChange);

		if (opts.matrix) this.localMatrix = opts.matrix;
		if (opts.parent) {
			opts.parent.add(this);
		}

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
		this.markWorldMatrixDirty();
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
		if (this.localMatrixDirty) {
			const pos = this.pos;
			const rot = this.rot;
			const scale = this.scale;
			this._localMatrix = Mat4.createPosRotScale(pos, rot, scale);
			this.localMatrixDirty = false;
		}
		return this._localMatrix.clone();
	}

	set localMatrix(value) {
		this._localMatrix.set(value);
		const {pos, rot, scale} = this._localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
		this.localMatrixDirty = false;
	}

	get worldMatrix() {
		this.updateWorldMatrixIfDirty();
		return this._worldMatrix.clone();
	}

	set worldMatrix(value) {
		const {pos, rot, scale} = value.decompose();
		this._worldPos.set(pos);
		this._worldRot.set(rot);
		this._worldScale.set(scale);
	}

	/**
	 * Marks the local matrix as dirty on this entity and the world matrix of all it's children.
	 * @private
	 */
	markLocalMatrixDirty() {
		this.localMatrixDirty = true;
		for (const child of this.traverseDown()) {
			child.worldMatrixDirty = true;
		}
	}

	/**
	 * Marks the world matrix of this entity and all its children as dirty.
	 * @private
	 */
	markWorldMatrixDirty() {
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
		if (this.localMatrixDirty || this.worldMatrixDirty) {
			if (this.parent) {
				this._worldMatrix = Mat4.multiplyMatrices(this.localMatrix, this.parent.worldMatrix);
			} else {
				this._worldMatrix = this.localMatrix.clone();
			}
			this.worldMatrixDirty = false;
			this.worldPosRotScaleDirty = true;
		}
	}

	/**
	 * @private
	 */
	updateWorldPosRotScaleIfDirty() {
		this.updateWorldMatrixIfDirty();
		if (!this.worldPosRotScaleDirty) return;
		const {pos, rot, scale} = this._worldMatrix.decompose();
		this._ignoreWorldChanges = true;
		this._worldPos.set(pos);
		this._worldRot.set(rot);
		this._worldScale.set(scale);
		this._ignoreWorldChanges = false;
		this.worldPosRotScaleDirty = false;
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
	addAtIndex(child, index = -1, keepWorldPosition = false) {
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
		yield this;
		for (const child of this._children) {
			if (filter == null || filter(child)) {
				yield* child.traverseDown({filter});
			}
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
		yield this;
		if (this.parent) {
			if (filter == null || filter(this.parent)) {
				yield* this.parent.traverseUp({filter});
			}
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
	 */
	clone() {
		const clone = new Entity({
			name: this.name,
		});

		for (const component of this.components) {
			clone.addComponent(component.clone());
		}

		for (const child of this.children) {
			clone.add(child.clone());
		}

		return clone;
	}

	/**
	 * @param {EntityToJsonOptions?} editorOpts
	 * @returns {EntityJsonData}
	 */
	toJson(editorOpts = null) {
		/** @typedef {Entity & {[x: symbol] : any}} EntityWithAssetRootUuid */

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
				json.components.push(component.toJson(editorOpts));
			}
		}

		const children = [];
		if (ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT && editorOpts && editorOpts.entityAssetRootUuidSymbol) {
			const sym = editorOpts.entityAssetRootUuidSymbol;
			for (const child of this.getChildren()) {
				const castChild = /** @type {EntityWithAssetRootUuid} */ (child);
				if (castChild[sym]) {
					/** @type {EntityJsonDataAssetEntity} */
					const childJson = {
						assetUuid: castChild[sym],
					};
					children.push(childJson);
				} else {
					children.push(child.toJson(editorOpts));
				}
			}
		} else {
			for (const child of this.getChildren()) {
				children.push(child.toJson(editorOpts));
			}
		}
		if (children.length > 0) {
			json.children = children;
		}

		return json;
	}
}
