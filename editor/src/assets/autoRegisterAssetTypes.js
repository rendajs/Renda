import {ProjectAssetTypeAssetBundle} from "./projectAssetType/ProjectAssetTypeAssetBundle.js";
import {ProjectAssetTypeClusteredLightsConfig} from "./projectAssetType/ProjectAssetTypeClusteredLightsConfig.js";
import {ProjectAssetTypeEntity} from "./projectAssetType/ProjectAssetTypeEntity.js";
import {ProjectAssetTypeJavascript} from "./projectAssetType/ProjectAssetTypeJavascript.js";
import {ProjectAssetTypeMaterial} from "./projectAssetType/ProjectAssetTypeMaterial.js";
import {ProjectAssetTypeMaterialMap} from "./projectAssetType/projectAssetTypeMaterialMap/ProjectAssetTypeMaterialMap.js";
import {ProjectAssetTypeMesh} from "./projectAssetType/ProjectAssetTypeMesh.js";
import {ProjectAssetTypeRenderOutputConfig} from "./projectAssetType/ProjectAssetTypeRenderOutputConfig.js";
import {ProjectAssetTypeShaderSource} from "./projectAssetType/ProjectAssetTypeShaderSource.js";
import {ProjectAssetTypeVertexState} from "./projectAssetType/ProjectAssetTypeVertexState.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "./projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";

/** @type {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny[]} */
const autoRegisterAssetTypes = [
	ProjectAssetTypeAssetBundle,
	ProjectAssetTypeClusteredLightsConfig,
	ProjectAssetTypeEntity,
	ProjectAssetTypeJavascript,
	ProjectAssetTypeMaterial,
	ProjectAssetTypeMaterialMap,
	ProjectAssetTypeMesh,
	ProjectAssetTypeRenderOutputConfig,
	ProjectAssetTypeShaderSource,
	ProjectAssetTypeVertexState,
	ProjectAssetTypeWebGpuPipelineConfig,
];
export {autoRegisterAssetTypes};
