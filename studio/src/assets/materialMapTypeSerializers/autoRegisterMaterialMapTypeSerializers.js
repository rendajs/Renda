// import {WebGlMaterialMapType} from "./WebGlMaterialMapType.js";
import { MaterialMapTypeSerializerWebGpu } from "./MaterialMapTypeSerializerWebGpu.js";

/** @type {import("./MaterialMapTypeSerializer.js").MaterialMapTypeSerializerConstructor[]} */
const autoRegisterMaterialMapTypeSerializers = [
	// WebGlMaterialMapType,
	MaterialMapTypeSerializerWebGpu,
];

export { autoRegisterMaterialMapTypeSerializers };
