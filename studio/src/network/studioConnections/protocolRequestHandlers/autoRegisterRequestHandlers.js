import {fileSystemProtocolHandlers} from "./FileSystem.js";

const autoRegisterRequestHandlers = [...fileSystemProtocolHandlers];

export {autoRegisterRequestHandlers};
