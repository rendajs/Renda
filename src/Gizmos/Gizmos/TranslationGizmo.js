import {MeshComponent} from "../../Components/mod.js";
import {Mesh} from "../../core/Mesh.js";
import Vec3 from "../../Math/Vec3.js";
import {Gizmo} from "./Gizmo.js";

export class TranslationGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.arrowMesh = new Mesh();
		this.arrowMesh.setVertexState(this.gizmoManager.meshVertexState);

		const indices = [0, 1, 2, 3, 4, 5];
		const colors = [
			new Vec3(1, 0.15, 0.15),
			new Vec3(1, 0.15, 0.15),

			new Vec3(0.15, 1, 0.15),
			new Vec3(0.15, 1, 0.15),

			new Vec3(0.15, 0.15, 1),
			new Vec3(0.15, 0.15, 1),
		];
		const positions = [
			new Vec3(0, 0, 0),
			new Vec3(1, 0, 0),

			new Vec3(0, 0, 0),
			new Vec3(0, 1, 0),

			new Vec3(0, 0, 0),
			new Vec3(0, 0, 1),
		];

		this.meshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.arrowMesh,
			materials: [this.gizmoManager.meshMaterial],
		});

		this.arrowMesh.setVertexCount(8);
		this.arrowMesh.setIndexData(indices);
		this.arrowMesh.setVertexData(Mesh.AttributeType.COLOR, colors);
		this.arrowMesh.setVertexData(Mesh.AttributeType.POSITION, positions);
	}

	destructor() {
		super.destructor();

		this.arrowMesh.destructor();
		this.arrowMesh = null;
	}

	updateMaterials() {
		this.arrowMesh.setVertexState(this.gizmoManager.meshVertexState);
		this.meshComponent.materials = [this.gizmoManager.meshMaterial];
	}
}
