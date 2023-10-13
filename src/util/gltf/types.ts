export interface GltfExtensionData {
	[extensionName: string]: any;
}

export type GltfExtrasData = any;

export interface GltfObjectBase {
	extensions?: GltfExtensionData;
	extras?: GltfExtrasData;
}

export interface GltfRootObjectBase extends GltfObjectBase {
	name?: string;
}

export interface GltfJsonData extends GltfObjectBase {
	extensionsUsed?: string[];
	extensionsRequired?: string[];
	accessors?: GltfAccessorData[];
	asset: GltfAssetData;
	buffers?: GltfBufferData[];
	bufferViews?: GltfBufferViewData[];
	images?: GltfImageData[];
	materials?: GltfMaterialData[];
	meshes?: GltfMeshData[];
	nodes?: GltfNodeData[];
	samplers?: GltfSamplerData[];
	scene?: number;
	scenes?: GltfSceneData[];
	textures?: GltfTextureData[];
}

export interface GltfAssetData extends GltfObjectBase {
	copyright?: string;
	generator?: string;
	version: string;
	minVersion?: string;
}

export interface GltfNodeData extends GltfRootObjectBase {
	camera?: number;
	children?: number[];
	skin?: number;
	matrix?: number[];
	mesh?: number;
	rotation?: number[];
	scale?: number[];
	translation?: number[];
	weights?: number[];
	extras?: unknown;
}

export interface GltfSceneData extends GltfRootObjectBase {
	nodes?: number[];
}

export interface GltfMaterialData extends GltfRootObjectBase {
	pbrMetallicRoughness?: GltfMaterialPbrMetallicRoughnessData;
	normalTexture?: GltfNormalTextureInfoData;
	occlusionTexture?: GltfOcclusionTextureInfoData;
	emissiveTexture?: GltfTextureInfoData;
	emissiveFactor?: number[];
	alphaMode?: string;
	alphaCutoff?: number;
	doubleSided?: boolean;
}

export interface GltfMaterialPbrMetallicRoughnessData extends GltfObjectBase {
	baseColorFactor?: number[];
	baseColorTexture?: GltfTextureInfoData;
	metallicFactor?: number;
	roughnessFactor?: number;
	metallicRoughnessTexture?: GltfTextureInfoData;
}

export interface GltfTextureData extends GltfRootObjectBase {
	sampler?: number;
	source?: number;
}

export interface GltfSamplerData extends GltfRootObjectBase {
	magFilter?: number;
	minFilter?: number;
	wrapS?: number;
	wrapT?: number;
}

export interface GltfImageData extends GltfRootObjectBase {
	uri?: string;
	mimeType?: string;
	bufferView?: number;
}

export interface GltfTextureInfoData extends GltfObjectBase {
	index: number;
	texCoord?: number;
}

export interface GltfNormalTextureInfoData extends GltfTextureInfoData {
	scale?: number;
}

export interface GltfOcclusionTextureInfoData extends GltfTextureInfoData {
	strength?: number;
}

export interface GltfMeshData extends GltfRootObjectBase {
	primitives: GltfMeshPrimitiveData[];
	weights?: number[];
}

export interface GltfMeshPrimitiveData extends GltfObjectBase {
	attributes: {[x: string]: number};
	indices?: number;
	material?: number;
	mode?: number;
	targets?: never[];
}

export interface GltfBufferData extends GltfRootObjectBase {
	uri?: string;
	byteLength: number;
}

export interface GltfBufferViewData extends GltfRootObjectBase {
	buffer: number;
	byteOffset?: number;
	byteLength: number;
	byteStride?: number;
	target?: number;
}

export type GltfAccessorType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";

export interface GltfAccessorData extends GltfRootObjectBase {
	bufferView?: number;
	byteOffset?: number;
	componentType: number;
	normalized?: boolean;
	count: number;
	type: GltfAccessorType;
	max?: number[];
	min?: number[];
	sparse?: never;
}
