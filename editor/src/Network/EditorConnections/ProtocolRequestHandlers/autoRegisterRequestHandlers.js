import {fileSystemProtocolHandlers} from "./FileSystem.js";

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler[]} */
const autoRegisterRequestHandlers = [...fileSystemProtocolHandlers];

export {autoRegisterRequestHandlers};
