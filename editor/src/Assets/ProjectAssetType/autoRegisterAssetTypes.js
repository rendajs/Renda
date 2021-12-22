import {ProjectAssetTypeAssetBundle} from "./ProjectAssetTypeAssetBundle.js";
import {ProjectAssetTypeClusteredLightsConfig} from "./ProjectAssetTypeClusteredLightsConfig.js";
import {ProjectAssetTypeEntity} from "./ProjectAssetTypeEntity.js";
import {ProjectAssetTypeJavascript} from "./ProjectAssetTypeJavascript.js";
import {ProjectAssetTypeMaterial} from "./ProjectAssetTypeMaterial.js";
import {ProjectAssetTypeMaterialMap} from "./ProjectAssetTypeMaterialMap/ProjectAssetTypeMaterialMap.js";
import {ProjectAssetTypeMesh} from "./ProjectAssetTypeMesh.js";
import {ProjectAssetTypeRenderOutputConfig} from "./ProjectAssetTypeRenderOutputConfig.js";
import {ProjectAssetTypeShaderSource} from "./ProjectAssetTypeShaderSource.js";
import {ProjectAssetTypeVertexState} from "./ProjectAssetTypeVertexState.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "./ProjectAssetTypeWebGpuPipelineConfig.js";

/** @type {import("./ProjectAssetType.js").ProjectAssetTypeConstructor<any>[]} */
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
