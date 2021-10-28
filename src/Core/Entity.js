import {Quaternion, Vec3} from "../Math/Math.js";
import {Component, defaultComponentTypeManager} from "../Components/Components.js";
import EntityParent from "./EntityParent.js";
import EntityMatrixCache from "./EntityMatrixCache.js";
import MultiKeyWeakMap from "../Util/MultiKeyWeakMap.js";

/**
 * @typedef {Object} CreateEntityOptions
 * @property {string} [name = "Entity"]
 * @property {import("../Math/Mat4.js").default} [matrix = null]
 * @property {Entity} [parent = null]
 */

export default class Entity {
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
		/** @type {Set<EntityParent<this>>} */
		this._entityParents = new Set();
		/** @type {MultiKeyWeakMap<EntityParent[], *>} */
		this._matrixCaches = new MultiKeyWeakMap();
		/** @type {Entity[]} */
		this._children = [];
		/** @type {Component[]} */
		this.components = [];

		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirtyAll.bind(this);
		this._pos = new Vec3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		this._rot = new Quaternion();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		this._scale = Vec3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

		if (opts.matrix) this.localMatrix = opts.matrix;
		if (opts.parent) {
			opts.parent.add(this);
		}

		/**
		 * @typedef {<C extends Component, A extends any[]>(componentConstructor: new (...args: A) => C, ...args: A) => C} addComponentConstructorSignature
		 * @typedef {<T extends Component>(componentInstance: T) => T} addComponentInstanceSignature
		 * @typedef {(componentUuid: string, ...rest: ConstructorParameters<typeof Component>) => Component} addComponentUuidSignature
		 */

		/** @type {addComponentConstructorSignature & addComponentInstanceSignature & addComponentUuidSignature} */
		this.addComponent = (...args) => {
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
			let CompenentConstructor = null;
			if (typeof firstArg == "string") {
				CompenentConstructor = defaultComponentTypeManager.getComponentConstructorForUuid(firstArg);
			} else if (firstArg.prototype instanceof Component) {
				CompenentConstructor = firstArg;
			}
			if (!CompenentConstructor) {
				throw new TypeError("Invalid arguments. addComponent takes a Component constructor, Component instance or Component uuid.");
			}

			const [, ...restArgs] = args;
			component = new CompenentConstructor(...restArgs);
		}

		// let component = /** @type {Component} */ (firstArg);
		// if (!(component instanceof Component)) {

		this.components.push(component);
		this._componentAttachedToEntity(component, this);
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
	 * @param {Component} component
	 * @param {Entity} entity
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
	 * @returns {T}
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
		for (const {child} of this.traverseDown()) {
			for (const component of child.getComponents(componentConstructor)) {
				yield component;
			}
		}
	}

	*_getEntityParents() {
		for (const entityParent of this._entityParents) {
			const parent = entityParent.getParent();
			if (parent) {
				yield {entityParent, parent};
			} else {
				this._entityParents.delete(entityParent);
			}
		}
	}

	*parents() {
		for (const {parent} of this._getEntityParents()) {
			yield parent;
		}
	}

	/**
	 * Returns the first parent of this entity.
	 * Null if this entity has no parents.
	 * @returns {Entity | null}
	 */
	get parent() {
		/** @type {EntityParent<this> | null} */
		const entityParent = this._entityParents.values().next().value;
		if (entityParent) {
			return entityParent.getParent();
		}
		return null;
	}

	get isRoot() {
		return !this.parent;
	}

	get pos() {
		return this._pos;
	}

	set pos(value) {
		this._pos.set(value);
	}

	get rot() {
		return this._rot;
	}

	set rot(value) {
		this._rot.set(value);
	}

	get scale() {
		return this._scale;
	}

	set scale(value) {
		this._scale.set(value);
	}

	get localMatrix() {
		const {matrixCache} = this._getFirstMatrixCache();
		return matrixCache.getLocalMatrix(this.pos, this.rot, this.scale);
	}

	set localMatrix(value) {
		const {matrixCache} = this._getFirstMatrixCache();
		matrixCache.setLocalMatrix(value);
		this.markWorldMatrixDirtyAll();
		const {pos, rot, scale} = matrixCache.localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
	}

	get worldMatrix() {
		const {matrixCache, traversedPath} = this._getFirstMatrixCache();
		return matrixCache.getWorldMatrix(traversedPath, this.pos, this.rot, this.scale);
	}

	/**
	 * Marks the local matrix as dirty on this entity and all it's children.
	 */
	markLocalMatrixDirtyAll() {
		const traversedUpPaths = Array.from(this._getAllRootTraversedUpPaths());
		this._markLocalMatrixDirtyAll(traversedUpPaths);
		this._markWorldMatrixDirtyAll(traversedUpPaths);
	}

	/**
	 * Marks the world matrix of this entity and all its children as dirty.
	 */
	markWorldMatrixDirtyAll() {
		const traversedUpPaths = Array.from(this._getAllRootTraversedUpPaths());
		this._markWorldMatrixDirtyAll(traversedUpPaths);
	}

	/**
	 * @param {TraversedPathEntry[][]} traversedUpPaths
	 */
	_markLocalMatrixDirtyAll(traversedUpPaths) {
		for (const traversedUpPath of traversedUpPaths) {
			const matrixCache = this._getMatrixCache(traversedUpPath);
			matrixCache.localMatrixDirty = true;
		}
	}

	/**
	 * @param {TraversedPathEntry[][]} traversedUpPaths
	 */
	_markWorldMatrixDirtyAll(traversedUpPaths) {
		for (const {child, traversedPath} of this.traverseDown()) {
			for (const traversedUpPath of traversedUpPaths) {
				// eslint-disable-next-line no-underscore-dangle
				child.markWorldMatrixDirty([...traversedUpPath, ...traversedPath]);
			}
		}
	}

	*_getAllRootTraversedUpPaths() {
		for (const {parent, traversedPath} of this.traverseUp()) {
			if (parent.isRoot) {
				yield [...traversedPath];
			}
		}
	}

	/**
	 * Marks the world matrix of this entity dirty based on the traversed parents path.
	 * @param {TraversedPathEntry[]} traversedPath
	 */
	markWorldMatrixDirty(traversedPath) {
		const matrixCache = this._getMatrixCache(traversedPath);
		matrixCache.worldMatrixDirty = true;
	}

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 */
	getWorldMatrix(traversedPath) {
		const matrixCache = this._getMatrixCache(traversedPath);
		return matrixCache.getWorldMatrix(traversedPath, this.pos, this.rot, this.scale);
	}

	_getFirstMatrixCache() {
		const traversedPath = this._getAllRootTraversedUpPaths().next().value;
		if (!traversedPath) return null;
		return {
			matrixCache: this._getMatrixCache(traversedPath),
			traversedPath,
		};
	}

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 * @param {boolean} failIfIncomplete
	 */
	_getEntityParentsForTraversedPath(traversedPath, failIfIncomplete = true) {
		/** @type {EntityParent<this>[]} */
		const entityParentsPath = [];
		let lastParent = this;
		for (let i = traversedPath.length - 1; i >= 0; i--) {
			const traversedPathEntry = traversedPath[i];
			// eslint-disable-next-line no-underscore-dangle
			const entityParent = lastParent._getEntityParent(traversedPathEntry);
			lastParent = traversedPathEntry.parent;
			if (!entityParent) {
				throw new Error(`Entity in traversed path (${lastParent.name}) is not a parent of this entity (${this.name}).`);
			}
			entityParentsPath.push(entityParent);
		}
		if (failIfIncomplete && !lastParent.isRoot) {
			throw new Error("Traversed path is not complete.");
		}
		return entityParentsPath;
	}

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 * @returns {EntityMatrixCache}
	 */
	_getMatrixCache(traversedPath) {
		const entityParents = this._getEntityParentsForTraversedPath(traversedPath);
		let cache = this._matrixCaches.get(entityParents);
		if (!cache) {
			cache = new EntityMatrixCache();
			this._matrixCaches.set(entityParents, cache);
		}
		return cache;
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
		// eslint-disable-next-line no-underscore-dangle
		child._parentAdded(this, index);
		if (index >= this._children.length) {
			this._children.push(child);
		} else {
			this._children.splice(index, 0, child);
			// todo: update indices
		}
	}

	/**
	 * Removes a child from this entity.
	 * @param {Entity} child
	 */
	remove(child) {
		for (const [i, c] of this._children.entries()) {
			if (c == child) {
				this.removeIndex(i);
				return;
			}
		}
	}

	/**
	 * Removes a child at a specific index from this entity.
	 * @param {number} index
	 */
	removeIndex(index) {
		const child = this._children[index];
		// eslint-disable-next-line no-underscore-dangle
		child._parentRemoved(this);
		this._children.splice(index, 1);
	}

	/**
	 * @param {this} newParent
	 * @param {number} index
	 */
	_parentAdded(newParent, index) {
		this._entityParents.add(new EntityParent(newParent, index));
	}

	/**
	 * @param {TraversedPathEntry} traversedPathEntry
	 * @returns {EntityParent<this> | null}
	 */
	_getEntityParent(traversedPathEntry) {
		for (const entityParent of this._entityParents) {
			if (
				entityParent.getParent() == traversedPathEntry.parent &&
				entityParent.index == traversedPathEntry.index
			) {
				return entityParent;
			}
		}
		return null;
	}

	/**
	 * Detaches this entity from all its parents.
	 */
	detachParents() {
		for (const parent of this.parents()) {
			parent.remove(this);
		}
	}

	/**
	 * Detaches a specific parent from this entity.
	 * @param {Entity} parent
	 */
	detachParent(parent) {
		parent.remove(this);
	}

	/**
	 * @param {Entity} oldParent
	 */
	_parentRemoved(oldParent) {
		for (const entityParent of this._entityParents) {
			if (entityParent.getParent() == oldParent) {
				this._entityParents.delete(entityParent);
				break;
			}
		}
	}

	*getChildren() {
		for (const child of this._children) {
			yield child;
		}
	}

	get children() {
		return Array.from(this.getChildren());
	}

	/**
	 * @returns {Generator<Entity>}
	 */
	*getRoots() {
		const foundRoots = new Set();
		const parents = new Set(this.parents());
		if (parents.size == 0) {
			yield this;
		} else {
			for (const parent of parents) {
				for (const root of parent.getRoots()) {
					if (!foundRoots.has(root)) {
						foundRoots.add(root);
						yield root;
					}
				}
			}
		}
	}

	/**
	 * Gets the first found root of this entity, null if this entity has no parents.
	 * @returns {Entity}
	 */
	getRoot() {
		return this.getRoots().next().value || null;
	}

	/**
	 * @typedef {Object} TraversedPathEntry
	 * @property {this} parent
	 * @property {number} index
	 */

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 * @returns {Generator<{child: Entity, traversedPath: TraversedPathEntry[]}>}
	 */
	*traverseDown(traversedPath = []) {
		yield {
			child: this,
			traversedPath,
		};
		for (const [i, child] of this._children.entries()) {
			traversedPath.push({
				parent: this,
				index: i,
			});
			for (const result of child.traverseDown(traversedPath)) {
				yield result;
			}
			traversedPath.pop();
		}
	}

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 * @returns {Generator<{parent: Entity, traversedPath: TraversedPathEntry[]}>}
	 */
	*traverseUp(traversedPath = []) {
		yield {
			parent: this,
			traversedPath,
		};
		for (const {parent, entityParent} of this._getEntityParents()) {
			traversedPath.unshift({
				parent,
				index: entityParent.index,
			});
			for (const result of parent.traverseUp(traversedPath)) {
				yield result;
			}
			traversedPath.shift();
		}
	}

	/**
	 * @param {Entity} child
	 * @returns {boolean}
	 */
	containsChild(child) {
		for (const {child: c} of this.traverseDown()) {
			if (c == child) return true;
		}
		return false;
	}

	getEntityByIndicesPath(indexPath, startFrom = 0) {
		if (startFrom >= indexPath.length) return this;
		const index = indexPath[startFrom];
		const child = this.children[index];
		return child.getEntityByIndicesPath(indexPath, startFrom + 1);
	}

	getEntityByName(name) {
		for (const {child} of this.traverseDown()) {
			if (child.name == name) return child;
		}
		return null;
	}

	toJson(editorOpts = null) {
		const json = {
			name: this.name,
			matrix: this.localMatrix.getFlatArray(),
			components: [],
			children: [],
		};
		for (const component of this.components) {
			json.components.push(component.toJson(editorOpts));
		}
		for (const child of this.getChildren()) {
			json.children.push(child.toJson(editorOpts));
		}
		if (json.components.length <= 0) delete json.components;
		if (json.children.length <= 0) delete json.children;
		return json;
	}
}
