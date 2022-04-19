// import {WebGlMaterialMapType} from "./WebGlMaterialMapType.js";
import {WebGpuMaterialMapTypeSerializer} from "./WebGpuMaterialMapTypeSerializer.js";

/** @type {import("./MaterialMapTypeSerializer.js").MaterialMapTypeSerializerConstructor[]} */
const autoRegisterMaterialMapTypeSerializers = [
	// WebGlMaterialMapType,
	WebGpuMaterialMapTypeSerializer,
];

export {autoRegisterMaterialMapTypeSerializers};
