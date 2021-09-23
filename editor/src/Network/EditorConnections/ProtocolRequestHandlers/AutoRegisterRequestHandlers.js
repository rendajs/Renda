import fileSystemHandlers from "./fileSystem.js";

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler[]} */
const autoRegisterRequestHandlers = [...fileSystemHandlers];
export default autoRegisterRequestHandlers;
