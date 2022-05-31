export interface GltfExtensionData {
	[extensionName: string]: any;
}

export type GltfExtrasData = any;

export interface GltfObjectBase {
	extensions?: GltfExtensionData;
	extras?: GltfExtrasData;
}

export interface GltfJsonData extends GltfObjectBase {
	extensionsUsed?: string[];
	extensionsRequired?: string[];
	accessors?: GltfAccessorData[];
	asset: GltfAssetData;
	buffers?: GltfBufferData[];
	bufferViews?: GltfBufferViewData[];
	materials?: GltfMaterialData[];
	meshes?: GltfMeshData[];
	nodes?: GltfNodeData[];
	scene?: number;
	scenes?: GltfSceneData[];
}

export interface GltfAssetData extends GltfObjectBase {
	copyright?: string;
	generator?: string;
	version: string;
	minVersion?: string;
}

export interface GltfNodeData extends GltfObjectBase {
	camera?: number;
	children?: number[];
	skin?: number;
	matrix?: number[];
	mesh?: number;
	rotation?: number[];
	scale?: number[];
	translation?: number[];
	weights?: number[];
	name?: string;
}

export interface GltfSceneData extends GltfObjectBase {
	nodes?: number[];
	name?: string;
}

export interface GltfMaterialData extends GltfObjectBase {
	name?: string;
	pbrMetallicRoughness?: GltfMaterialPbrMetallicRoughnessData;
	normalTexture?: never;
	occlusionTexture?: never;
	emissiveTexture?: never;
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

export interface GltfTextureInfoData extends GltfObjectBase {
	index: number;
	texCoord?: number;
}

export interface GltfMeshData extends GltfObjectBase {
	primitives: GltfMeshPrimitiveData[];
	weights?: number[];
	name?: string;
}

export interface GltfMeshPrimitiveData extends GltfObjectBase {
	attributes: {[x: string]: number};
	indices?: number;
	material?: number;
	mode?: number;
	targets?: never[];
}

export interface GltfBufferData extends GltfObjectBase {
	uri?: string;
	byteLength: number;
	name?: string;
}

export interface GltfBufferViewData extends GltfObjectBase {
	buffer: number;
	byteOffset?: number;
	byteLength: number;
	byteStride?: number;
	target?: number;
	name?: string;
}

export type GltfAccessorType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";

export interface GltfAccessorData extends GltfObjectBase {
	bufferView?: number;
	byteOffset?: number;
	componentType: number;
	normalized?: boolean;
	count: number;
	type: GltfAccessorType;
	max?: number[];
	min?: number[];
	sparse?: never;
	name?: string;
}
