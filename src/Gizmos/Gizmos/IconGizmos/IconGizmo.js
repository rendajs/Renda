import Gizmo from "../Gizmo.js";
import Mesh from "../../../Core/Mesh.js";
import MeshComponent from "../../../Components/BuiltIn/MeshComponent.js";
import Vec3 from "../../../Math/Vec3.js";
import Vec2 from "../../../Math/Vec2.js";

export default class IconGizmo extends Gizmo {
	constructor(...args) {
		super(...args);

		this.mesh = new Mesh();
		this.mesh.setVertexState(this.gizmoManager.billboardVertexState);

		this.indices = [];
		this.positions = [];
		this.colors = [];

		this.meshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.mesh,
			materials: [this.gizmoManager.billboardMaterial],
		});
	}

	destructor() {
		super.destructor();

		this.mesh.destructor();
		this.mesh = null;
	}

	updateMesh() {
		this.mesh.setVertexCount(this.positions.length);
		this.mesh.setIndexData(this.indices);
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, this.positions);
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, this.colors);
	}

	addCircle(segments, radius, origin = new Vec2()) {
		const startIndex = this.positions.length;
		for (let i = 0; i < segments; i++) {
			const theta = i / segments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos = new Vec2(x, y);
			pos.multiply(radius);
			pos.add(origin);
			this.positions.push(pos);
			this.colors.push(new Vec3(1, 1, 1));
			this.indices.push(startIndex + i);
			if (i == segments - 1) {
				this.indices.push(startIndex);
			} else {
				this.indices.push(startIndex + i + 1);
			}
		}
	}

	addLine(start, end) {
		const startIndex = this.positions.length;
		this.positions.push(start, end);
		this.colors.push(new Vec3(1, 1, 1), new Vec3(1, 1, 1));
		this.indices.push(startIndex, startIndex + 1);
	}

	updateMaterials() {
		this.mesh.setVertexState(this.gizmoManager.billboardVertexState);
		this.meshComponent.materials = [this.gizmoManager.billboardMaterial];
	}
}
