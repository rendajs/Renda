import {fileSystemProtocolHandlers} from "./FileSystem.js";
import {inspectorProtocolHandlers} from "./inspector.js";

const autoRegisterRequestHandlers = [
	...fileSystemProtocolHandlers,
	...inspectorProtocolHandlers,
];

export {autoRegisterRequestHandlers};
