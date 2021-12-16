import Gizmo from "./Gizmo.js";
import {Mesh} from "../../Core/Mesh.js";
import MeshComponent from "../../Components/BuiltIn/MeshComponent.js";
import Vec3 from "../../Math/Vec3.js";

export default class CameraClusterDataGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.boundsMesh = new Mesh();
		this.boundsMesh.setVertexState(this.gizmoManager.meshVertexState);
		this.boundsMesh.setVertexCount(0);
		this.boundsMesh.setIndexData([]);

		this.entity.addComponent(MeshComponent, {
			mesh: this.boundsMesh,
			materials: [this.gizmoManager.meshMaterial],
		});
	}

	destructor() {
		super.destructor();

		this.boundsMesh.destructor();
		this.boundsMesh = null;
	}

	setClusterBoundsData(boundsData) {
		const vertices = [];
		const colors = [];
		const indices = [];
		for (let i = 0; i < boundsData.length; i += 2) {
			const min = boundsData[i];
			const max = boundsData[i + 1];
			const j = vertices.length;
			indices.push(
				j + 0,
				j + 1,
				j + 1,
				j + 3,
				j + 3,
				j + 2,
				j + 2,
				j + 0,
				j + 0,
				j + 4,
				j + 1,
				j + 5,
				j + 2,
				j + 6,
				j + 3,
				j + 7,
				j + 4,
				j + 5,
				j + 5,
				j + 7,
				j + 7,
				j + 6,
				j + 6,
				j + 4
			);
			vertices.push(
				new Vec3(min, min, min),
				new Vec3(min.x, min.y, max.z),
				new Vec3(min.x, max.y, min.z),
				new Vec3(min.x, max.y, max.z),
				new Vec3(max.x, min.y, min.z),
				new Vec3(max.x, min.y, max.z),
				new Vec3(max.x, max.y, min.z),
				new Vec3(max.x, max.y, max.z)
			);
			const col = new Vec3(0.5, 0.5, 0.5);
			colors.push(col, col, col, col, col, col, col, col);
		}
		this.boundsMesh.setVertexCount(vertices.length);
		this.boundsMesh.setIndexData(indices);
		this.boundsMesh.setVertexData(Mesh.AttributeType.COLOR, colors);
		this.boundsMesh.setVertexData(Mesh.AttributeType.POSITION, vertices);
	}
}
