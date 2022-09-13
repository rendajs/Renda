import {ProjectAssetTypeClusteredLightsConfig} from "./projectAssetType/ProjectAssetTypeClusteredLightsConfig.js";
import {ProjectAssetTypeEntity} from "./projectAssetType/ProjectAssetTypeEntity.js";
import {ProjectAssetTypeGltf} from "./projectAssetType/ProjectAssetTypeGltf.js";
import {ProjectAssetTypeHtml} from "./projectAssetType/ProjectAssetTypeHtml.js";
import {ProjectAssetTypeJavascript} from "./projectAssetType/ProjectAssetTypeJavascript.js";
import {ProjectAssetTypeMaterial} from "./projectAssetType/ProjectAssetTypeMaterial.js";
import {ProjectAssetTypeMaterialMap} from "./projectAssetType/ProjectAssetTypeMaterialMap.js";
import {ProjectAssetTypeMesh} from "./projectAssetType/ProjectAssetTypeMesh.js";
import {ProjectAssetTypeSampler} from "./projectAssetType/ProjectAssetTypeSampler.js";
import {ProjectAssetTypeTask} from "./projectAssetType/ProjectAssetTypeTask.js";
import {ProjectAssetTypeTexture} from "./projectAssetType/ProjectAssetTypeTexture.js";
import {ProjectAssetTypeRenderOutputConfig} from "./projectAssetType/ProjectAssetTypeRenderOutputConfig.js";
import {ProjectAssetTypeShaderSource} from "./projectAssetType/ProjectAssetTypeShaderSource.js";
import {ProjectAssetTypeVertexState} from "./projectAssetType/ProjectAssetTypeVertexState.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "./projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";

/** @type {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny[]} */
const autoRegisterAssetTypes = [
	ProjectAssetTypeClusteredLightsConfig,
	ProjectAssetTypeEntity,
	ProjectAssetTypeGltf,
	ProjectAssetTypeHtml,
	ProjectAssetTypeJavascript,
	ProjectAssetTypeMaterial,
	ProjectAssetTypeMaterialMap,
	ProjectAssetTypeMesh,
	ProjectAssetTypeSampler,
	ProjectAssetTypeTask,
	ProjectAssetTypeTexture,
	ProjectAssetTypeRenderOutputConfig,
	ProjectAssetTypeShaderSource,
	ProjectAssetTypeVertexState,
	ProjectAssetTypeWebGpuPipelineConfig,
];
export {autoRegisterAssetTypes};
