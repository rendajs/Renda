export class ComponentGizmos {
	// set this to the componentType as used by the component manager (not the component uuid)
	static componentType = null;

	// a list of gizmo constructors
	// these will automatically be created and destroyed with the component/entity
	static requiredGizmos = [];

	constructor(component, gizmoManager) {
		this.component = component;
		this.gizmoManager = gizmoManager;

		this.createdGizmos = [];
		const constr = /** @type {typeof ComponentGizmos} */ (this.constructor);
		for (const gizmoConstructor of constr.requiredGizmos) {
			const gizmo = gizmoManager.addGizmo(gizmoConstructor);
			this.createdGizmos.push(gizmo);
		}
	}

	destructor() {
		for (const gizmo of this.createdGizmos) {
			this.gizmoManager.removeGizmo(gizmo);
		}
	}

	// update your gizmos here
	componentPropertyChanged() {}

	entityMatrixChanged(matrix) {
		for (const gizmo of this.createdGizmos) {
			gizmo.matrix = matrix;
		}
	}

	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView ComponentGizmos.js for more info.");
	}
}
