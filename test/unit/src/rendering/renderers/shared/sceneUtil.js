import { CameraComponent, ClusteredLightsConfig, Entity, Mesh, MeshComponent, VertexState, createCube } from "../../../../../../src/mod.js";

export function createCam() {
	const cam = new Entity();
	const camComponent = cam.addComponent(CameraComponent);
	camComponent.clusteredLightsConfig = new ClusteredLightsConfig();
	return { camComponent, cam };
}

export function createVertexState() {
	const vertexState = new VertexState({
		buffers: [
			{
				stepMode: "vertex",
				arrayStride: 12,
				attributes: [
					{
						attributeType: Mesh.AttributeType.POSITION,
						componentCount: 3,
						format: Mesh.AttributeFormat.FLOAT32,
						unsigned: false,
					},
				],
			},
			{
				stepMode: "vertex",
				arrayStride: 16,
				attributes: [
					{
						attributeType: Mesh.AttributeType.COLOR,
						componentCount: 4,
						format: Mesh.AttributeFormat.FLOAT32,
						unsigned: false,
					},
				],
			},
		],
	});
	return vertexState;
}

/**
 * @param {object} options
 * @param {Entity} options.scene
 * @param {import("../../../../../../src/mod.js").Material} options.material
 * @param {VertexState} options.vertexState
 */
export function createCubeEntity({ scene, material, vertexState }) {
	const cubeEntity = scene.add(new Entity("cube"));
	const meshComponent = cubeEntity.addComponent(MeshComponent);
	meshComponent.mesh = createCube({ vertexState });
	meshComponent.materials = [material];

	return { mesh: meshComponent.mesh, cubeEntity };
}
