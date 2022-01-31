/**
 * @template {import("../../../../src/mod.js").Component} T
 * @template {import("../../../../src/Gizmos/Gizmos/Gizmo.js").Gizmo[]} TRequiredGizmos
 * @typedef {new (...args: any) => ComponentGizmos<T, TRequiredGizmos>} ComponentGizmosConstructor
 */
/** @typedef {ComponentGizmosConstructor<import("../../../../src/mod.js").Component, import("../../../../src/Gizmos/Gizmos/Gizmo.js").Gizmo[]>} ComponentGizmosConstructorAny */
/** @typedef {ComponentGizmos<import("../../../../src/mod.js").Component, import("../../../../src/Gizmos/Gizmos/Gizmo.js").Gizmo[]>} ComponentGizmosAny */

/**
 * @template {import("../../../../src/mod.js").Component} T
 * @typedef {[import("../../Editor.js").Editor, T, import("../../../../src/mod.js").GizmoManager]} ComponentGizmosConstructorParameters
 */

/**
 * @template {import("../../../../src/mod.js").Component} T
 * @template {import("../../../../src/Gizmos/Gizmos/Gizmo.js").Gizmo[]} TRequiredGizmos
 */
export class ComponentGizmos {
	/**
	 * Set this to the Constructor of the component that this gizmo should be used for.
	 * @type {import("../../../../src/Components/Component.js").ComponentConstructor?}
	 */
	static componentType = null;

	/**
	 * These will automatically be created and destroyed with the component/entity.
	 * @type {(new (...args: any) => import("../../../../src/Gizmos/Gizmos/Gizmo.js").Gizmo)[]}
	 */
	static requiredGizmos = [];

	/**
	 * @param {import("../../Editor.js").Editor} editor
	 * @param {T} component
	 * @param {import("../../../../src/mod.js").GizmoManager} gizmoManager
	 */
	constructor(editor, component, gizmoManager) {
		this.editor = editor;
		this.component = component;
		this.gizmoManager = gizmoManager;

		const createdGizmos = [];
		const constr = /** @type {typeof ComponentGizmos} */ (this.constructor);
		for (const gizmoConstructor of constr.requiredGizmos) {
			const gizmo = gizmoManager.addGizmo(gizmoConstructor);
			createdGizmos.push(gizmo);
		}
		this.createdGizmos = /** @type {TRequiredGizmos} */(createdGizmos);
	}

	destructor() {
		for (const gizmo of this.createdGizmos) {
			this.gizmoManager.removeGizmo(gizmo);
		}
	}

	// update your gizmos here
	componentPropertyChanged() {}

	/**
	 * @param {import("../../../../src/mod.js").Mat4} matrix
	 */
	entityMatrixChanged(matrix) {
		for (const gizmo of this.createdGizmos) {
			gizmo.matrix = matrix;
		}
	}

	/**
	 * @param {string} message
	 */
	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView ComponentGizmos.js for more info.");
	}
}
