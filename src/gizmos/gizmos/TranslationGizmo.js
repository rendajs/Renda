import {MeshComponent} from "../../components/builtIn/MeshComponent.js";
import {Mesh} from "../../core/Mesh.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";
import {Sphere} from "../../math/shapes/Sphere.js";
import {Gizmo} from "./Gizmo.js";
import {Entity} from "../../core/Entity.js";
import {blueColor, greenColor, hoverColor, redColor, whiteColor} from "./colors.js";

export class TranslationGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.circleMaterialColor = new Vec3(whiteColor);
		this.xArrowColor = new Vec3(redColor);
		this.yArrowColor = new Vec3(greenColor);
		this.zArrowColor = new Vec3(blueColor);

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

		this.centerDraggable = this.gizmoManager.createDraggable("move");
		const sphere = new Sphere(0.5);
		this.centerDraggable.addRaycastShape(sphere);
		this.entity.add(this.centerDraggable.entity);
		this.centerDraggable.onIsHoveringChange(isHovering => {
			if (isHovering) {
				this.circleMaterialColor.set(hoverColor);
			} else {
				this.circleMaterialColor.set(whiteColor);
			}
			this.gizmoNeedsRender();
		});
		this.centerDraggable.onDrag(e => {
			this.pos.add(e.delta);
			this.gizmoNeedsRender();
		});

		this.arrowMesh = new Mesh();
		this.arrowMesh.setVertexState(this.gizmoManager.meshVertexState);

		const arrowColors = [
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
		];
		const arrowPositions = [
			new Vec3(0, 0, 0),
			new Vec3(1, 0, 0),
		];
		this.arrowMesh.setVertexCount(8);
		this.arrowMesh.setIndexData([0, 1]);
		this.arrowMesh.setVertexData(Mesh.AttributeType.COLOR, arrowColors);
		this.arrowMesh.setVertexData(Mesh.AttributeType.POSITION, arrowPositions);

		const meshX = this.createArrow({
			axis: new Vec3(1, 0, 0),
			colorInstance: this.xArrowColor,
			defaultColor: redColor,
		});
		const meshY = this.createArrow({
			axis: new Vec3(0, 1, 0),
			colorInstance: this.yArrowColor,
			defaultColor: greenColor,
		});
		const meshZ = this.createArrow({
			axis: new Vec3(0, 0, 1),
			colorInstance: this.zArrowColor,
			defaultColor: blueColor,
		});
		this.xArrowMesh = meshX;
		this.yArrowMesh = meshY;
		this.zArrowMesh = meshZ;

		this.updateAssets();
	}

	destructor() {
		super.destructor();

		this.arrowMesh.destructor();
	}

	updateAssets() {
		this.arrowMesh.setVertexState(this.gizmoManager.meshVertexState);
		if (this.gizmoManager.meshMaterial) {
			const material = this.gizmoManager.meshMaterial;
			const xMaterial = material.clone();
			const yMaterial = material.clone();
			const zMaterial = material.clone();
			xMaterial.setProperty("colorMultiplier", this.xArrowColor);
			yMaterial.setProperty("colorMultiplier", this.yArrowColor);
			zMaterial.setProperty("colorMultiplier", this.zArrowColor);
			this.xArrowMesh.materials = [xMaterial];
			this.yArrowMesh.materials = [yMaterial];
			this.zArrowMesh.materials = [zMaterial];
		} else {
			this.xArrowMesh.materials = [];
			this.yArrowMesh.materials = [];
			this.zArrowMesh.materials = [];
		}

		this.circleMesh.setVertexState(this.gizmoManager.billboardVertexState);
		/** @type {import("../../rendering/Material.js").Material[]} */
		let circleMaterials = [];
		if (this.gizmoManager.billboardMaterial) {
			const circleMaterial = this.gizmoManager.billboardMaterial.clone();
			circleMaterial.setProperty("colorMultiplier", this.circleMaterialColor);
			circleMaterials = [circleMaterial];
		}
		this.circleMeshComponent.materials = circleMaterials;
	}

	/**
	 * @param {object} options
	 * @param {Vec3} options.axis
	 * @param {Vec3} options.colorInstance The Vec3 instance that should be changed when hovering.
	 * @param {Vec3} options.defaultColor The color of the arrow when not hovering
	 */
	createArrow({
		axis,
		colorInstance,
		defaultColor,
	}) {
		const entity = new Entity();
		const meshComponent = entity.addComponent(MeshComponent, {
			mesh: this.arrowMesh,
			materials: [this.gizmoManager.meshMaterial],
		});
		// Create a rotation axis perpendicular to the axis that we want the
		// arrow to point along, and a [1,0,0] vector, since that is the
		// direction of the mesh.
		const rotationAxis = Vec3.right.cross(axis);
		// if the axis in the right direction, there's no need to rotate the object.
		if (rotationAxis.magnitude > 0) {
			entity.rot.setFromAxisAngle(rotationAxis, Math.PI / 2);
		}
		this.entity.add(entity);

		const draggable = this.gizmoManager.createDraggable("move-axis");
		this.entity.add(draggable.entity);
		draggable.entity.pos.set(axis);
		const sphere = new Sphere(0.5);
		draggable.addRaycastShape(sphere);
		draggable.axis.set(axis);
		draggable.onIsHoveringChange(isHovering => {
			if (isHovering) {
				colorInstance.set(hoverColor);
			} else {
				colorInstance.set(defaultColor);
			}
			this.gizmoNeedsRender();
		});
		draggable.onDrag(e => {
			this.pos.add(e.delta);
			this.gizmoNeedsRender();
		});

		return meshComponent;
	}
}
