import {Mat4, Quaternion, Vec3} from "../Math/Math.js";
import {Component, defaultComponentTypeManager} from "../Components/Components.js";
import EntityParent from "./EntityParent.js";
import EntityMatrixCache from "./EntityMatrixCache.js";
import MultiKeyWeakMap from "../Util/MultiKeyWeakMap.js";

/**
 * @typedef {Object} CreateEntityOptions
 * @property {string} [name = "Entity"]
 * @property {Mat4} [matrix = null]
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
		/** @type {Set<EntityParent>} */
		this._entityParents = new Set();
		/** @type {MultiKeyWeakMap<EntityParent[], *>} */
		this._matrixCaches = new MultiKeyWeakMap();
		/** @type {Entity[]} */
		this._children = [];
		this.components = [];

		this.localMatrixDirty = false;
		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirty.bind(this);
		this.worldMatrixDirty = false;
		this._localMatrix = new Mat4();
		this._worldMatrix = new Mat4();
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

	// if the argument already is a component, it will be detached
	// from the old entity and attached it to this one
	/**
	 * @template T
	 * @param {ConstructorParameters<typeof Component>} args
	 * @returns {Component & {[x: string]: *}}
	 */
	addComponent(...args) {
		const firstArg = /** @type {*} */ (args[0]);
		let component = /** @type {Component} */ (firstArg);
		if (!(component instanceof Component)) {
			component = new Component(...args);
		}

		this.components.push(component);
		component.attachedToEntity(this);
		return component;
	}

	getComponent(type, componentTypeManager = defaultComponentTypeManager) {
		for (const component of this.getComponents(type, componentTypeManager)) {
			return component;
		}
		return null;
	}

	*getComponents(type, componentTypeManager = defaultComponentTypeManager) {
		const component = componentTypeManager.getComponentFromData(type, false);
		const uuid = component.uuid;
		for (const component of this.components) {
			if (component.componentUuid == uuid && component.componentTypeManager == componentTypeManager) {
				yield component;
			}
		}
	}

	*getChildComponents(type, componentTypeManager = defaultComponentTypeManager) {
		for (const {child} of this.traverseDown()) {
			for (const component of child.getComponents(type, componentTypeManager)) {
				yield component;
			}
		}
	}

	*parents() {
		for (const entityParent of this._entityParents) {
			const parent = entityParent.getParent();
			if (parent) yield parent;
		}
	}

	/**
	 * Returns the first parent of this entity.
	 * Null if this entity has no parents.
	 * @returns {Entity | null}
	 */
	get parent() {
		/** @type {EntityParent | null} */
		const entityParent = this._entityParents.values().next().value;
		if (entityParent) {
			return entityParent.getParent();
		}
		return null;
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
		if (this.localMatrixDirty) {
			this._localMatrix = Mat4.createPosRotScale(this.pos, this.rot, this.scale);
			this.localMatrixDirty = false;
		}
		return this._localMatrix;
	}

	set localMatrix(value) {
		this._localMatrix.set(value);
		const {pos, rot, scale} = this._localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
		this.localMatrixDirty = false;
		this.worldMatrixDirty = true;
	}

	get worldMatrix() {
		if (this.localMatrixDirty || this.worldMatrixDirty) {
			// todo: support for getting world matrix based on parent
			if (this.parent) {
				this._worldMatrix = Mat4.multiplyMatrices(this.localMatrix, this.parent.worldMatrix);
			} else {
				this._worldMatrix = this.localMatrix.clone();
			}
			this.worldMatrixDirty = false;
		}
		return this._worldMatrix;
	}

	markLocalMatrixDirty() {
		this.localMatrixDirty = true;
		for (const {child} of this.traverseDown()) {
			child.worldMatrixDirty = true;
		}
	}

	/**
	 * @param {TraversedPathEntry[]} traversedPath
	 */
	getWorldMatrix(traversedPath) {
		/** @type {EntityParent[]} */
		const entityParents = [];
		let lastParent = this;
		for (let i = traversedPath.length - 1; i >= 0; i--) {
			const traversedPathEntry = traversedPath[i];
			// eslint-disable-next-line no-underscore-dangle
			const entityParent = lastParent._getEntityParent(traversedPathEntry);
			lastParent = traversedPathEntry.parent;
			if (!entityParent) {
				throw new Error(`Entity in traversed path (${parent.name}) is not a parent of this entity (${this.name}).`);
			}
			entityParents.push(entityParent);
		}

		const matrixCache = this._getMatrixCache(entityParents);
		if (matrixCache.localMatrixDirty || matrixCache.worldMatrixDirty) {
			const localMatrix = this.localMatrix;
			if (entityParents.length > 0) {
				const parent = entityParents[0].getParent();
				const parentMatrix = parent.getWorldMatrix(traversedPath.slice(0, -1));
				matrixCache.worldMatrix = Mat4.multiplyMatrices(localMatrix, parentMatrix);
			} else {
				matrixCache.worldMatrix = localMatrix.clone();
			}
			// matrixCache.worldMatrixDirty = false;
		}

		return matrixCache.worldMatrix;
	}

	/**
	 * @param {EntityParent[]} entityParents
	 * @returns {EntityMatrixCache}
	 */
	_getMatrixCache(entityParents) {
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
	 * @param {number} index
	 */
	removeIndex(index) {
		const child = this._children[index];
		// eslint-disable-next-line no-underscore-dangle
		child._parentRemoved(this);
		this._children.splice(index, 1);
	}

	/**
	 * @param {Entity} newParent
	 * @param {number} index
	 */
	_parentAdded(newParent, index) {
		this._entityParents.add(new EntityParent(newParent, index));
	}

	/**
	 * @param {TraversedPathEntry} traversedPathEntry
	 * @returns {EntityParent | null}
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

	*traverseUp() {
		yield this;
		for (const parent of this.parents()) {
			for (const c of parent.traverseUp()) {
				yield c;
			}
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
