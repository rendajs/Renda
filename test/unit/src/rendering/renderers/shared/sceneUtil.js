import { CameraComponent, ClusteredLightsConfig, Entity, Material, MaterialMap, Mesh, ShaderSource, VertexState, WebGpuMaterialMapType, WebGpuPipelineConfig } from "../../../../../../src/mod.js";

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

export function createMaterial() {
	const material = new Material();
	const materialMapType = new WebGpuMaterialMapType();
	const pipelineConfig = new WebGpuPipelineConfig();
	pipelineConfig.vertexShader = new ShaderSource("");
	pipelineConfig.fragmentShader = new ShaderSource("");
	materialMapType.forwardPipelineConfig = pipelineConfig;
	const materialMap = new MaterialMap({
		materialMapTypes: [
			{
				mapType: materialMapType,
				mappedValues: {},
			},
		],
	});
	material.setMaterialMap(materialMap);
	return { material };
}
