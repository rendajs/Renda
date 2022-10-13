import {Mesh} from "../../core/Mesh.js";
import {Vec3} from "../../math/Vec3.js";
import {Entity} from "../../core/Entity.js";
import {Gizmo} from "./Gizmo.js";
import {MeshComponent} from "../../components/builtIn/MeshComponent.js";
import {blueColor, greenColor, hoverColor, redColor} from "./colors.js";
import {Sphere} from "../../math/shapes/Sphere.js";

export class RotationGizmo extends Gizmo {
	/**
	 * @param  {ConstructorParameters<typeof Gizmo>} args
	 */
	constructor(...args) {
		super(...args);

		this.xCircleColor = new Vec3(redColor);
		this.yCircleColor = new Vec3(greenColor);
		this.zCircleColor = new Vec3(blueColor);

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
			positions.push(new Vec3(x, y, 0));
			colors.push(new Vec3(1, 1, 1));
		}
		this.circleMesh.setVertexCount(segments);
		this.circleMesh.setIndexData(indices);
		this.circleMesh.setVertexData(Mesh.AttributeType.POSITION, positions);
		this.circleMesh.setVertexData(Mesh.AttributeType.COLOR, colors);

		this.xCircleMesh = this.createCircle({
			axis: new Vec3(0, 1, 0),
			raycastScale: new Vec3(0.1, 1.1, 1.1),
			colorInstance: this.xCircleColor,
			defaultColor: redColor,
		});
		this.yCircleMesh = this.createCircle({
			axis: new Vec3(1, 0, 0),
			raycastScale: new Vec3(1.1, 0.1, 1.1),
			colorInstance: this.yCircleColor,
			defaultColor: greenColor,
		});
		this.zCircleMesh = this.createCircle({
			axis: new Vec3(0, 0, 1),
			raycastScale: new Vec3(1.1, 1.1, 0.1),
			colorInstance: this.zCircleColor,
			defaultColor: blueColor,
		});
	}

	destructor() {
		super.destructor();

		this.circleMesh.destructor();
	}

	/**
	 * @override
	 */
	updateAssets() {
		this.circleMesh.setVertexState(this.gizmoManager.meshVertexState);
		if (this.gizmoManager.meshMaterial) {
			const material = this.gizmoManager.meshMaterial;
			const xMaterial = material.clone();
			const yMaterial = material.clone();
			const zMaterial = material.clone();
			xMaterial.setProperty("colorMultiplier", this.xCircleColor);
			yMaterial.setProperty("colorMultiplier", this.yCircleColor);
			zMaterial.setProperty("colorMultiplier", this.zCircleColor);
			this.xCircleMesh.materials = [xMaterial];
			this.yCircleMesh.materials = [yMaterial];
			this.zCircleMesh.materials = [zMaterial];
		} else {
			this.xCircleMesh.materials = [];
			this.yCircleMesh.materials = [];
			this.zCircleMesh.materials = [];
		}
	}

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

		entity.rot.setFromAxisAngle(axis, Math.PI / 2);

		this.entity.add(entity);

		const draggable = this.gizmoManager.createDraggable("rotate-axis");
		draggable.axis.set(axis);
		this.entity.add(draggable.entity);
		draggable.entity.scale.set(raycastScale);
		const sphere = new Sphere(1);
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
			this.pos.add(e.delta);
			this.gizmoNeedsRender();
		});

		return meshComponent;
	}
}
