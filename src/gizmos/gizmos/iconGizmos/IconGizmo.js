import { Gizmo } from "../Gizmo.js";
import { Mesh } from "../../../core/Mesh.js";
import { MeshComponent } from "../../../components/builtIn/MeshComponent.js";
import { Vec3 } from "../../../math/Vec3.js";
import { Vec2 } from "../../../math/Vec2.js";

export class IconGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.mesh = new Mesh();
		this.mesh.setVertexState(this.gizmoManager.billboardVertexState);

		/** @type {number[]} */
		this.indices = [];
		/** @type {Vec2[]} */
		this.positions = [];
		/** @type {Vec3[]} */
		this.colors = [];

		this.meshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.mesh,
			materials: [this.gizmoManager.billboardMaterial],
		});
	}

	destructor() {
		super.destructor();

		this.mesh.destructor();
	}

	updateMesh() {
		this.mesh.setVertexCount(this.positions.length);
		this.mesh.setIndexData(this.indices);
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, this.positions, { unusedComponentCount: 2 });
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, this.colors);
	}

	/**
	 * @param {number} segments
	 * @param {number} radius
	 */
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

	/**
	 * @param {Vec2} start
	 * @param {Vec2} end
	 */
	addLine(start, end) {
		const startIndex = this.positions.length;
		this.positions.push(start, end);
		this.colors.push(new Vec3(1, 1, 1), new Vec3(1, 1, 1));
		this.indices.push(startIndex, startIndex + 1);
	}

	updateAssets() {
		this.mesh.setVertexState(this.gizmoManager.billboardVertexState);
		this.meshComponent.materials = [this.gizmoManager.billboardMaterial];
	}
}
