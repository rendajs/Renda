import {MeshComponent} from "../../Components/Components.js";
import Mesh from "../../Core/Mesh.js";
import Vec3 from "../../Math/Vec3.js";
import Gizmo from "./Gizmo.js";

export default class TranslationGizmo extends Gizmo {
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
