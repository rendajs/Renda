import {generateUuid} from "../../../../../src/util/mod.js";

/**
 * A single connection to a client.
 * The internal discovery worker keeps a list of connections to it.
 * That list is a list of instances of this class.
 */
export class InternalDiscoveryWorkerConnection {
	/**
	 * @param {MessagePort} port
	 * @param {import("../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").ClientType} clientType
	 * @param {import("./internalDiscoveryWorkerMain.js").WorkerToIframeTypedMessengerType} iframeMessenger
	 * @param {import("./internalDiscoveryWorkerMain.js").WorkerToParentTypedMessengerType} parentWindowMessenger
	 */
	constructor(port, clientType, iframeMessenger, parentWindowMessenger) {
		this.id = generateUuid();
		/**
		 * The MessagePort to that is being used to communicate between the.
		 * InternalDiscoveryWorker and the client.
		 */
		this.port = port;
		this.clientType = clientType;
		/** @type {import("../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} */
		this.projectMetaData = null;
		this.iframeMessenger = iframeMessenger;
		this.parentMessenger = parentWindowMessenger;
	}

	/**
	 * @param {import("../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} projectMetaData
	 */
	setProjectMetaData(projectMetaData) {
		this.projectMetaData = projectMetaData;
	}

	/**
	 * @returns {import("../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").AvailableStudioData}
	 */
	getConnectionData() {
		return {
			id: this.id,
			clientType: this.clientType,
			projectMetaData: this.projectMetaData,
		};
	}
}
