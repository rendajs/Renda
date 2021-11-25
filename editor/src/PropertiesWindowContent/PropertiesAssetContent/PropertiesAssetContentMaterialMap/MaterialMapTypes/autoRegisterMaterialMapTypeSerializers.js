// import {MaterialMapTypeWebGlRenderer} from "./MaterialMapTypeWebGlRenderer.js";
import {MaterialMapTypeSerializerWebGpuRenderer} from "./MaterialMapTypeSerializerWebGpuRenderer.js";

const autoRegisterMaterialMapTypeSerializers = [
	// MaterialMapTypeWebGlRenderer,
	MaterialMapTypeSerializerWebGpuRenderer,
];

export {autoRegisterMaterialMapTypeSerializers};
