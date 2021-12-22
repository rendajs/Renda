import {generateUuid} from "../../../../../src/util/mod.js";

export class InternalDiscoveryWorkerConnection {
	/**
	 * @param {MessagePort} port
	 * @param {string} clientType
	 */
	constructor(port, clientType) {
		this.id = generateUuid();
		this.port = port;
		this.clientType = clientType;
		this.projectMetaData = null;
	}

	setProjectMetaData(projectMetaData) {
		this.projectMetaData = projectMetaData;
	}
}
