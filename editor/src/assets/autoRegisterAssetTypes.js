import {AssetBundleProjectAssetType} from "./projectAssetType/AssetBundleProjectAssetType.js";
import {ClusteredLightsConfigProjectAssetType} from "./projectAssetType/ClusteredLightsConfigProjectAssetType.js";
import {EntityProjectAssetType} from "./projectAssetType/EntityProjectAssetType.js";
import {GltfProjectAssetType} from "./projectAssetType/GltfProjectAssetType.js";
import {JavascriptProjectAssetType} from "./projectAssetType/JavascriptProjectAssetType.js";
import {MaterialProjectAssetType} from "./projectAssetType/MaterialProjectAssetType.js";
import {MaterialMapProjectAssetType} from "./projectAssetType/MaterialMapProjectAssetType.js";
import {MeshProjectAssetType} from "./projectAssetType/MeshProjectAssetType.js";
import {SamplerProjectAssetType} from "./projectAssetType/SamplerProjectAssetType.js";
import {TaskProjectAssetType} from "./projectAssetType/TaskProjectAssetType.js";
import {TextureProjectAssetType} from "./projectAssetType/TextureProjectAssetType.js";
import {RenderOutputConfigProjectAssetType} from "./projectAssetType/RenderOutputConfigProjectAssetType.js";
import {ShaderSourceProjectAssetType} from "./projectAssetType/ShaderSourceProjectAssetType.js";
import {VertexStateProjectAssetType} from "./projectAssetType/VertexStateProjectAssetType.js";
import {WebGpuPipelineConfigProjectAssetType} from "./projectAssetType/WebGpuPipelineConfigProjectAssetType.js";

/** @type {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny[]} */
const autoRegisterAssetTypes = [
	AssetBundleProjectAssetType,
	ClusteredLightsConfigProjectAssetType,
	EntityProjectAssetType,
	GltfProjectAssetType,
	JavascriptProjectAssetType,
	MaterialProjectAssetType,
	MaterialMapProjectAssetType,
	MeshProjectAssetType,
	SamplerProjectAssetType,
	TaskProjectAssetType,
	TextureProjectAssetType,
	RenderOutputConfigProjectAssetType,
	ShaderSourceProjectAssetType,
	VertexStateProjectAssetType,
	WebGpuPipelineConfigProjectAssetType,
];
export {autoRegisterAssetTypes};
