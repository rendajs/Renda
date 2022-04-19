import {Gizmo} from "./Gizmo.js";
import {Mesh} from "../../core/Mesh.js";
import {MeshComponent} from "../../components/builtIn/MeshComponent.js";
import {Vec3} from "../../math/Vec3.js";
import {Vec4} from "../../math/Vec4.js";

export class CameraGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.mesh = new Mesh();
		this.mesh.setVertexState(this.gizmoManager.meshVertexState);

		const indices = [0, 1, 1, 3, 3, 2, 2, 0, 0, 4, 1, 5, 2, 6, 3, 7, 4, 5, 5, 7, 7, 6, 6, 4];
		const colors = [
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
		];

		this.meshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.mesh,
			materials: [this.gizmoManager.meshMaterial],
		});

		this.mesh.setVertexCount(8);
		this.mesh.setIndexData(indices);
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, colors);
	}

	destructor() {
		super.destructor();

		this.mesh.destructor();
	}

	/**
	 * @param {import("../../math/Mat4.js").Mat4} projection
	 */
	setProjectionMatrix(projection) {
		const positionsCube = [
			new Vec3(-1, -1, 0),
			new Vec3(-1, -1, 1),
			new Vec3(-1, 1, 0),
			new Vec3(-1, 1, 1),
			new Vec3(1, -1, 0),
			new Vec3(1, -1, 1),
			new Vec3(1, 1, 0),
			new Vec3(1, 1, 1),
		];
		const inverse = projection.inverse();
		const positionsFrustum = positionsCube.map(pos => {
			const pos4 = new Vec4(pos);
			pos4.multiplyMatrix(inverse);
			pos4.divide(pos4.w);
			return new Vec3(pos4);
		});
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, positionsFrustum);
	}

	updateAssets() {
		this.mesh.setVertexState(this.gizmoManager.meshVertexState);
		this.meshComponent.materials = [this.gizmoManager.meshMaterial];
	}
}
