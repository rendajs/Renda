import fileSystemHandlers from "./FileSystem.js";

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler[]} */
const autoRegisterRequestHandlers = [...fileSystemHandlers];
export default autoRegisterRequestHandlers;
