// import {MaterialMapTypeWebGlRenderer} from "./MaterialMapTypeWebGlRenderer.js";
import {MaterialMapTypeSerializerWebGpuRenderer} from "./MaterialMapTypeSerializerWebGpuRenderer.js";

/** @type {import("./MaterialMapTypeSerializer.js").MaterialMapTypeSerializerConstructor[]} */
const autoRegisterMaterialMapTypeSerializers = [
	// MaterialMapTypeWebGlRenderer,
	MaterialMapTypeSerializerWebGpuRenderer,
];

export {autoRegisterMaterialMapTypeSerializers};
