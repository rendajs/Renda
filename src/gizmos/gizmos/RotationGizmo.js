import { Mesh } from "../../core/Mesh.js";
import { Vec3 } from "../../math/Vec3.js";
import { Entity } from "../../core/Entity.js";
import { Gizmo } from "./Gizmo.js";
import { MeshComponent } from "../../components/builtIn/MeshComponent.js";
import { blueColor, greenColor, hoverColor, redColor } from "./colors.js";
import { Sphere } from "../../math/shapes/Sphere.js";
import { Quat } from "../../math/Quat.js";

/**
 * @typedef RotationGizmoDragEvent
 * @property {import("../../math/Quat.js").Quat} localDelta
 * @property {import("../../math/Quat.js").Quat} worldDelta
 */

/**
 * @typedef {(event: RotationGizmoDragEvent) => void} RotationGizmoDragCallback
 */

export class RotationGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.xCircleColor = new Vec3(redColor);
		this.yCircleColor = new Vec3(greenColor);
		this.zCircleColor = new Vec3(blueColor);

		/** @type {Set<RotationGizmoDragCallback>} */
		this.onDragCbs = new Set();

		this.circleMesh = new Mesh();
		this.circleMesh.setVertexState(this.gizmoManager.meshVertexState);
		const segments = 32;
		this.circleMesh.setVertexCount(segments);
		const positions = [];
		const colors = [];
		const indices = [];
		for (let i = 0; i < segments; i++) {
			indices.push(i);
			if (i < segments - 1) {
				indices.push(i + 1);
			} else {
				indices.push(0);
			}
			const theta = i / segments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			positions.push(new Vec3(0, x, y));
			colors.push(new Vec3(1, 1, 1));
		}
		this.circleMesh.setVertexCount(segments);
		this.circleMesh.setIndexData(indices);
		this.circleMesh.setVertexData(Mesh.AttributeType.POSITION, positions);
		this.circleMesh.setVertexData(Mesh.AttributeType.COLOR, colors);

		/** @type {CreatedCircle[]} */
		this.createdCircles = [];
		this.createCircle({
			axis: new Vec3(1, 0, 0),
			raycastScale: new Vec3(0.1, 1.1, 1.1),
			colorInstance: this.xCircleColor,
			defaultColor: redColor,
		});

		this.createCircle({
			axis: new Vec3(0, 1, 0),
			raycastScale: new Vec3(1.1, 0.1, 1.1),
			colorInstance: this.yCircleColor,
			defaultColor: greenColor,
		});

		this.createCircle({
			axis: new Vec3(0, 0, 1),
			raycastScale: new Vec3(1.1, 1.1, 0.1),
			colorInstance: this.zCircleColor,
			defaultColor: blueColor,
		});

		this.updateAssets();
	}

	destructor() {
		super.destructor();

		this.circleMesh.destructor();

		for (const { draggable } of this.createdCircles) {
			this.gizmoManager.removeDraggable(draggable);
		}
	}

	/**
	 * @override
	 */
	updateAssets() {
		this.circleMesh.setVertexState(this.gizmoManager.meshVertexState);
		if (this.gizmoManager.meshMaterial) {
			const material = this.gizmoManager.meshMaterial;
			for (const circle of this.createdCircles) {
				const newMat = material.clone();
				newMat.setProperty("colorMultiplier", circle.colorInstance);
				circle.meshComponent.materials = [newMat];
			}
		} else {
			for (const circle of this.createdCircles) {
				circle.meshComponent.materials = [];
			}
		}
	}

	/**
	 * @typedef CreatedCircle
	 * @property {Vec3} axis
	 * @property {MeshComponent} meshComponent
	 * @property {import("../draggables/RotateAxisGizmoDraggable.js").RotateAxisGizmoDraggable} draggable
	 * @property {Vec3} colorInstance
	 */

	/**
	 * @param {object} options
	 * @param {Vec3} options.axis
	 * @param {Vec3} options.raycastScale
	 * @param {Vec3} options.colorInstance The Vec3 instance that should be changed when hovering.
	 * @param {Vec3} options.defaultColor The color of the arrow when not hovering
	 */
	createCircle({
		axis, raycastScale,
		colorInstance,
		defaultColor,
	}) {
		const entity = new Entity();
		const meshComponent = entity.addComponent(MeshComponent, {
			mesh: this.circleMesh,
			materials: [this.gizmoManager.meshMaterial],
		});

		// Create a rotation axis perpendicular to the axis that we want the
		// circle to rotate around, and a [1,0,0] vector, since that is the
		// direction of the mesh.
		const rotationAxis = Vec3.right.cross(axis);
		// if the axis already in the right direction, there's no need to rotate the object.
		if (rotationAxis.magnitude > 0) {
			entity.rot.setFromAxisAngle(rotationAxis, Math.PI / 2);
		}
		this.entity.add(entity);

		const draggable = this.gizmoManager.createDraggable("rotate-axis");
		draggable.axis.set(axis);
		this.entity.add(draggable.entity);
		draggable.entity.scale.set(raycastScale);
		const sphere = new Sphere();
		draggable.addRaycastShape(sphere);
		draggable.onIsHoveringChange(isHovering => {
			if (isHovering) {
				colorInstance.set(hoverColor);
			} else {
				colorInstance.set(defaultColor);
			}
			this.gizmoNeedsRender();
		});
		draggable.onDrag(e => {
			this.rot.preMultiply(e.worldDelta);
			this.gizmoNeedsRender();
			const localDelta = Quat.fromAxisAngle(axis, e.localDelta);
			this.onDragCbs.forEach(cb => cb({
				localDelta,
				worldDelta: e.worldDelta,
			}));
		});

		draggable.entity.addComponent(MeshComponent);

		this.createdCircles.push({
			axis, meshComponent, draggable, colorInstance,
		});
	}

	/**
	 * @param {RotationGizmoDragCallback} cb
	 */
	onDrag(cb) {
		this.onDragCbs.add(cb);
	}
}
