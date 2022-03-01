import {Mat4} from "../math/Mat4.js";
import {Quat} from "../math/Quat.js";
import {Vec3} from "../math/Vec3.js";
import {Component} from "../components/mod.js";
import {ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT} from "../engineDefines.js";
import {ComponentTypeManager} from "../components/ComponentTypeManager.js";

/**
 * @typedef {Object} CreateEntityOptions
 * @property {string} [name = "Entity"]
 * @property {import("../math/Mat4.js").Mat4?} [matrix = null]
 * @property {Entity?} [parent = null]
 */

/**
 * @typedef {Object} EntityJsonDataBase
 * @property {string} [name]
 */

/**
 * @typedef {Object} EntityJsonDataInlineEntityTypes
 * @property {number[]} matrix
 * @property {EntityJsonDataComponent[]} components
 * @property {EntityJsonData[]} children
 *
 * @typedef {EntityJsonDataBase & EntityJsonDataInlineEntityTypes} EntityJsonDataInlineEntity
 */

/**
 * @typedef {Object} EntityJsonDataAssetEntityTypes
 * @property {import("../mod.js").UuidString} assetUuid
 * @property {number[]} [pos]
 * @property {number[]} [rot]
 * @property {number[]} [scale]
 *
 * @typedef {EntityJsonDataBase & EntityJsonDataAssetEntityTypes} EntityJsonDataAssetEntity
 */

/** @typedef {EntityJsonDataInlineEntity | EntityJsonDataAssetEntity} EntityJsonData */

/**
 * @typedef {Object} EntityJsonDataComponent
 * @property {import("../mod.js").UuidString} uuid
 * @property {Object.<string, any>} propertyValues
 */

/**
 * @typedef {Object} EntityToJsonOptions
 * @property {import("../../editor/src/assets/AssetManager.js").AssetManager} assetManager
 * @property {import("../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {symbol} entityAssetRootUuidSymbol
 */

export class Entity {
	/**
	 * @param {CreateEntityOptions | string} opts
	 */
	constructor(opts = {}) {
		if (typeof opts == "string") {
			opts = {
				name: opts,
			};
		}
		opts = {
			...{
				name: "Entity",
				matrix: null,
				parent: null,
			}, ...opts,
		};
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

		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirty.bind(this);
		this._pos = new Vec3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		this._rot = new Quat();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		this._scale = Vec3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

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
		if (this.localMatrixDirty || this.worldMatrixDirty) {
			if (this.parent) {
				this._worldMatrix = Mat4.multiplyMatrices(this.localMatrix, this.parent.worldMatrix);
			} else {
				this._worldMatrix = this.localMatrix.clone();
			}
			this.worldMatrixDirty = false;
		}
		return this._worldMatrix.clone();
	}

	/**
	 * Marks the local matrix as dirty on this entity and the world matrix of all it's children.
	 */
	markLocalMatrixDirty() {
		this.localMatrixDirty = true;
		for (const child of this.traverseDown()) {
			child.worldMatrixDirty = true;
		}
	}

	/**
	 * Marks the world matrix of this entity and all its children as dirty.
	 */
	markWorldMatrixDirty() {
		this.worldMatrixDirty = true;
		for (const child of this.traverseDown()) {
			child.worldMatrixDirty = true;
		}
	}

	/**
	 * @param {Entity} child
	 * @param {boolean} keepWorldPosition
	 */
	add(child, keepWorldPosition = false) {
		this.addAtIndex(child, -1, keepWorldPosition);
	}

	/**
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
	}

	/**
	 * Removes a child from this entity.
	 * If the same child is attached multiple times, the first instance will be removed.
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
	 * @returns {Generator<Entity>}
	 */
	*traverseDown() {
		yield this;
		for (const child of this._children) {
			yield* child.traverseDown();
		}
	}

	/**
	 * @returns {Generator<Entity>}
	 */
	*traverseUp() {
		yield this;
		if (this.parent) {
			yield* this.parent.traverseUp();
		}
	}

	/**
	 * @param {Entity} child
	 * @returns {boolean}
	 */
	containsChild(child) {
		for (const c of this.traverseDown()) {
			if (c == child) return true;
		}
		return false;
	}

	/**
	 * @param {number[]} indexPath
	 * @returns {Entity}
	 */
	getEntityByIndicesPath(indexPath, startFrom = 0) {
		if (startFrom >= indexPath.length) return this;
		const index = indexPath[startFrom];
		const child = this.children[index];
		return child.getEntityByIndicesPath(indexPath, startFrom + 1);
	}

	/**
	 * @param {string} name
	 */
	getEntityByName(name) {
		for (const child of this.traverseDown()) {
			if (child.name == name) return child;
		}
		return null;
	}

	/**
	 * @param {EntityToJsonOptions?} editorOpts
	 * @returns {EntityJsonData}
	 */
	toJson(editorOpts = null) {
		/** @typedef {Entity & {[x: symbol] : any}} EntityWithAssetRootUuid */

		/** @type {EntityJsonDataInlineEntity} */
		const json = {
			name: this.name,
			matrix: this.localMatrix.getFlatArray(),
			components: [],
			children: [],
		};
		for (const component of this.components) {
			json.components.push(component.toJson(editorOpts));
		}
		if (ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT && editorOpts && editorOpts.entityAssetRootUuidSymbol) {
			const sym = editorOpts.entityAssetRootUuidSymbol;
			for (const child of this.getChildren()) {
				if (child[sym]) {
					/** @type {EntityJsonDataAssetEntity} */
					const childJson = {
						assetUuid: child[sym],
					};
					json.children.push(childJson);
				} else {
					json.children.push(child.toJson(editorOpts));
				}
			}
		} else {
			for (const child of this.getChildren()) {
				json.children.push(child.toJson(editorOpts));
			}
		}
		if (json.components.length <= 0) delete json.components;
		if (json.children.length <= 0) delete json.children;
		return json;
	}
}
