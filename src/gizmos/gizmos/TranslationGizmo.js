import {MeshComponent} from "../../components/mod.js";
import {Mesh} from "../../core/Mesh.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";
import {Sphere} from "../../math/shapes/Sphere.js";
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

		this.circleMaterialColor = new Vec3(1, 1, 1);

		const circleSegmentCount = 32;
		const circleColors = [];
		const circlePositions = [];
		const circleIndices = [];
		const circleRadius = 30;
		for (let i = 0; i < circleSegmentCount; i++) {
			circleColors.push(new Vec3(1, 1, 1));
			const theta = i / circleSegmentCount * Math.PI * 2;
			const x = Math.cos(theta) * circleRadius;
			const y = Math.sin(theta) * circleRadius;
			circlePositions.push(new Vec2(x, y));
			let nextIndex = i + 1;
			if (nextIndex >= circleSegmentCount) {
				nextIndex = 0;
			}
			circleIndices.push(i, nextIndex);
		}
		this.circleMesh = new Mesh();
		this.circleMesh.setVertexCount(circlePositions.length);
		this.circleMesh.setIndexData(circleIndices);
		this.circleMesh.setVertexData(Mesh.AttributeType.COLOR, circleColors, {
			unusedComponentCount: 3,
			unusedFormat: Mesh.AttributeFormat.FLOAT32,
		});
		this.circleMesh.setVertexData(Mesh.AttributeType.POSITION, circlePositions, {
			unusedComponentCount: 2,
			unusedFormat: Mesh.AttributeFormat.FLOAT32,
		});

		this.circleMeshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.circleMesh,
			materials: [],
		});

		this.meshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.arrowMesh,
			materials: [this.gizmoManager.meshMaterial],
		});

		this.arrowMesh.setVertexCount(8);
		this.arrowMesh.setIndexData(indices);
		this.arrowMesh.setVertexData(Mesh.AttributeType.COLOR, colors);
		this.arrowMesh.setVertexData(Mesh.AttributeType.POSITION, positions);

		this.centerDraggable = this.gizmoManager.createDraggable("move");
		const sphere = new Sphere();
		this.centerDraggable.addRaycastShape(sphere);
		this.centerDraggable.onIsHoveringChange(isHovering => {
			if (isHovering) {
				this.circleMaterialColor.set(1, 0.5, 0);
			} else {
				this.circleMaterialColor.set(1, 1, 1);
			}
			this.gizmoNeedsRender();
		});

		this.updateMaterials();
	}

	destructor() {
		super.destructor();

		this.arrowMesh.destructor();
	}

	updateMaterials() {
		this.arrowMesh.setVertexState(this.gizmoManager.meshVertexState);
		this.meshComponent.materials = [this.gizmoManager.meshMaterial];

		this.circleMesh.setVertexState(this.gizmoManager.billboardVertexState);
		/** @type {import("../../mod.js").Material[]} */
		let circleMaterials = [];
		if (this.gizmoManager.billboardMaterial) {
			const circleMaterial = this.gizmoManager.billboardMaterial.clone();
			circleMaterial.setProperty("colorMultiplier", this.circleMaterialColor);
			circleMaterials = [circleMaterial];
		}
		this.circleMeshComponent.materials = circleMaterials;
	}
}
