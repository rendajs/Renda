import {generateUuid} from "../../../../../src/util/mod.js";

/**
 * A single connection to a client.
 * The internal discovery worker keeps a list of connections to it.
 * That list is a list of instances of this class.
 */
export class InternalDiscoveryWorkerConnection {
	/**
	 * @param {MessagePort} port
	 * @param {import("../EditorConnectionsManager.js").ClientType} clientType
	 */
	constructor(port, clientType) {
		this.id = generateUuid();
		/**
		 * The MessagePort to that is being used to communicate between the.
		 * InternalDiscoveryWorker and the client.
		 */
		this.port = port;
		this.clientType = clientType;
		/** @type {import("../EditorConnectionsManager.js").RemoteEditorMetaData?} */
		this.projectMetaData = null;
	}

	/**
	 * @param {import("../EditorConnectionsManager.js").RemoteEditorMetaData} projectMetaData
	 */
	setProjectMetaData(projectMetaData) {
		this.projectMetaData = projectMetaData;
	}

	/**
	 * @param {import("../../../../../src/Inspector/InternalDiscoveryManager.js").InternalDiscoveryClientMessage} message
	 * @param {Transferable[]} transfer
	 */
	postMessage(message, transfer = []) {
		this.port.postMessage(message, transfer);
	}
}
