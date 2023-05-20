import {MeshComponent} from "../../components/builtIn/MeshComponent.js";
import {Mesh} from "../../core/Mesh.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";
import {Sphere} from "../../math/shapes/Sphere.js";
import {Gizmo} from "./Gizmo.js";
import {Entity} from "../../core/Entity.js";
import {blueColor, greenColor, hoverColor, redColor, whiteColor} from "./colors.js";

/**
 * @typedef ScaleGizmoDragEvent
 * @property {Vec3} localDelta
 */

/**
 * @typedef {(event: ScaleGizmoDragEvent) => void} ScaleGizmoDragCallback
 */

export class ScaleGizmo extends Gizmo {
	#circleMaterialColor = new Vec3(whiteColor);
	#xArrowColor = new Vec3(redColor);
	#yArrowColor = new Vec3(greenColor);
	#zArrowColor = new Vec3(blueColor);

	/** @type {Set<ScaleGizmoDragCallback>} */
	#onDragCbs = new Set();
	/** @type {Set<() => void>} */
	#onDragEndCbs = new Set();

	#circleMeshComponent;
	#circleMesh = new Mesh();

	/** @type {import("../draggables/GizmoDraggable.js").GizmoDraggable[]} */
	#createdDraggables = [];
	#centerDraggable;

	#arrowMesh = new Mesh();
	#xArrowMesh;
	#yArrowMesh;
	#zArrowMesh;

	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

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
		this.#circleMesh = new Mesh();
		this.#circleMesh.setVertexCount(circlePositions.length);
		this.#circleMesh.setIndexData(circleIndices);
		this.#circleMesh.setVertexData(Mesh.AttributeType.COLOR, circleColors, {
			unusedComponentCount: 3,
			unusedFormat: Mesh.AttributeFormat.FLOAT32,
		});
		this.#circleMesh.setVertexData(Mesh.AttributeType.POSITION, circlePositions, {
			unusedComponentCount: 2,
			unusedFormat: Mesh.AttributeFormat.FLOAT32,
		});

		this.#circleMeshComponent = this.entity.addComponent(MeshComponent, {
			mesh: this.#circleMesh,
			materials: [],
		});

		this.#centerDraggable = this.gizmoManager.createDraggable("scale");
		this.#createdDraggables.push(this.#centerDraggable);
		const sphere = new Sphere(0.5);
		this.#centerDraggable.addRaycastShape(sphere);
		this.entity.add(this.#centerDraggable.entity);
		this.#centerDraggable.onIsHoveringChange(isHovering => {
			if (isHovering) {
				this.#circleMaterialColor.set(hoverColor);
			} else {
				this.#circleMaterialColor.set(whiteColor);
			}
			this.gizmoNeedsRender();
		});
		this.#centerDraggable.onDrag(e => {
			const localDelta = new Vec3(1, 1, 1);
			localDelta.multiplyScalar(e.scaleDelta);

			this.#onDragCbs.forEach(cb => cb({
				localDelta,
			}));
		});
		this.#centerDraggable.onDragEnd(() => {
			this.#fireOnDragEndCbs();
		});

		this.#arrowMesh.setVertexState(this.gizmoManager.meshVertexState);

		const arrowColors = [
			new Vec3(1, 1, 1),
			new Vec3(1, 1, 1),
		];
		const arrowPositions = [
			new Vec3(0, 0, 0),
			new Vec3(1, 0, 0),
		];
		this.#arrowMesh.setVertexCount(8);
		this.#arrowMesh.setIndexData([0, 1]);
		this.#arrowMesh.setVertexData(Mesh.AttributeType.COLOR, arrowColors);
		this.#arrowMesh.setVertexData(Mesh.AttributeType.POSITION, arrowPositions);

		const meshX = this.#createArrow({
			axis: new Vec3(1, 0, 0),
			colorInstance: this.#xArrowColor,
			defaultColor: redColor,
		});
		const meshY = this.#createArrow({
			axis: new Vec3(0, 1, 0),
			colorInstance: this.#yArrowColor,
			defaultColor: greenColor,
		});
		const meshZ = this.#createArrow({
			axis: new Vec3(0, 0, 1),
			colorInstance: this.#zArrowColor,
			defaultColor: blueColor,
		});
		this.#xArrowMesh = meshX;
		this.#yArrowMesh = meshY;
		this.#zArrowMesh = meshZ;

		this.updateAssets();
	}

	destructor() {
		super.destructor();

		this.#arrowMesh.destructor();
		for (const draggable of this.#createdDraggables) {
			this.gizmoManager.removeDraggable(draggable);
		}
	}

	updateAssets() {
		this.#arrowMesh.setVertexState(this.gizmoManager.meshVertexState);
		if (this.gizmoManager.meshMaterial) {
			const material = this.gizmoManager.meshMaterial;
			const xMaterial = material.clone();
			const yMaterial = material.clone();
			const zMaterial = material.clone();
			xMaterial.setProperty("colorMultiplier", this.#xArrowColor);
			yMaterial.setProperty("colorMultiplier", this.#yArrowColor);
			zMaterial.setProperty("colorMultiplier", this.#zArrowColor);
			this.#xArrowMesh.materials = [xMaterial];
			this.#yArrowMesh.materials = [yMaterial];
			this.#zArrowMesh.materials = [zMaterial];
		} else {
			this.#xArrowMesh.materials = [];
			this.#yArrowMesh.materials = [];
			this.#zArrowMesh.materials = [];
		}

		this.#circleMesh.setVertexState(this.gizmoManager.billboardVertexState);
		/** @type {import("../../rendering/Material.js").Material[]} */
		let circleMaterials = [];
		if (this.gizmoManager.billboardMaterial) {
			const circleMaterial = this.gizmoManager.billboardMaterial.clone();
			circleMaterial.setProperty("colorMultiplier", this.#circleMaterialColor);
			circleMaterials = [circleMaterial];
		}
		this.#circleMeshComponent.materials = circleMaterials;
	}

	/**
	 * @param {object} options
	 * @param {Vec3} options.axis
	 * @param {Vec3} options.colorInstance The Vec3 instance that should be changed when hovering.
	 * @param {Vec3} options.defaultColor The color of the arrow when not hovering
	 */
	#createArrow({
		axis,
		colorInstance,
		defaultColor,
	}) {
		const entity = new Entity("Arrow");
		const meshComponent = entity.addComponent(MeshComponent, {
			mesh: this.#arrowMesh,
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
		this.#createdDraggables.push(draggable);
		draggable.axis.set(axis);
		this.entity.add(draggable.entity);
		draggable.entity.pos.set(axis);
		const sphere = new Sphere(0.5);
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
			const localDelta = axis.clone();
			localDelta.magnitude = e.localDelta;
			localDelta.addScalar(1);

			this.#onDragCbs.forEach(cb => cb({
				localDelta,
			}));
		});
		draggable.onDragEnd(() => {
			this.#fireOnDragEndCbs();
		});

		return meshComponent;
	}

	/**
	 * Allows you to override the current dragging state. Normally the dragging
	 * state only changes when the user clicks and drags an element of the gizmo.
	 * But this allows you to change the dragging state without the need for the
	 * user to move their mouse up or down.
	 * @param {boolean} isDragging
	 */
	setIsDragging(isDragging) {
		this.gizmoManager.forceDraggableDraggingState(this.#centerDraggable, isDragging);
	}

	/**
	 * @param {ScaleGizmoDragCallback} cb
	 */
	onDrag(cb) {
		this.#onDragCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	onDragEnd(cb) {
		this.#onDragEndCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnDragEnd(cb) {
		this.#onDragEndCbs.delete(cb);
	}

	#fireOnDragEndCbs() {
		this.#onDragEndCbs.forEach(cb => cb());
	}
}
