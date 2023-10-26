import {StudioConnectionsManager} from "../../../../src/network/studioConnections/StudioConnectionsManager.js";
import {DiscoveryManagerInternal} from "../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js";
import {DiscoveryManagerWebRtc} from "../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js";
import {createStudioHostHandlers} from "./handlers.js";

export class StudioConnectionsManagerManager {
	#projectManager;
	#preferencesManager;
	/** @type {StudioConnectionsManager<ReturnType<createStudioHostHandlers>, ReturnType<createStudioHostHandlers>>?} */
	#studioConnectionsManager = null;
	/** @type {DiscoveryManagerInternal?} */
	#discoveryManagerInternal = null;
	/** @type {DiscoveryManagerWebRtc?} */
	#discoveryManagerWebRtc = null;

	/** @type {string?} */
	#webRtcDiscoveryEndpoint = null;

	/** @type {Set<import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js").OnDiscoveryManagerWebRtcStatusChangeCallback>} */
	#onWebRtcDiscoveryServerStatusChangeCbs = new Set();
	/** @type {Set<() => void>} */
	#onConnectionsChangedCbs = new Set();

	/** @type {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} */
	#lastSentProjectMetaData = null;

	/**
	 * @param {import("../../projectSelector/ProjectManager.js").ProjectManager} projectManager
	 * @param {import("../../Studio.js").Studio["preferencesManager"]} preferencesManager
	 */
	constructor(projectManager, preferencesManager) {
		this.#projectManager = projectManager;
		this.#preferencesManager = preferencesManager;

		projectManager.onProjectOpen(this.#updateStudioConnectionsManager);
		projectManager.onRootHasWritePermissionsChange(this.#updateStudioConnectionsManager);
		projectManager.onProjectOpenEntryChange(this.#updateStudioConnectionsManager);

		preferencesManager.onChange("studioConnections.allowInternalIncoming", null, this.#updateStudioConnectionsManager);
		preferencesManager.onChange("studioConnections.allowRemoteIncoming", null, this.#updateStudioConnectionsManager);
	}

	#getDefaultInternalDiscoveryEndPoint() {
		return new URL("internalDiscovery", window.location.href).href;
	}

	getDefaultWebRtcDiscoveryEndPoint() {
		if (window.location.hostname == "renda.studio" || window.location.hostname.endsWith(".renda.studio")) {
			return "discovery.renda.studio";
		} else {
			const protocol = window.location.protocol == "https:" ? "wss" : "ws";
			return `${protocol}://${window.location.host}/studioDiscovery`;
		}
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/StudioConnectionsManager.js").ClientType} initiatorType
	 * @param {import("../../../../src/network/studioConnections/StudioConnectionsManager.js").ClientType} receiverType
	 */
	#isValidConnectionConfiguration(initiatorType, receiverType) {
		if (initiatorType == receiverType) return false;
		if (receiverType == "studio-client" && initiatorType == "studio-host") return false;

		return true;
	}

	#updateStudioConnectionsManager = () => {
		const allowInternalIncoming = this.#preferencesManager.get("studioConnections.allowInternalIncoming", null);
		const allowRemoteIncoming = this.#preferencesManager.get("studioConnections.allowRemoteIncoming", null);

		/** @type {import("../../../../src/network/studioConnections/StudioConnectionsManager.js").ClientType?} */
		const desiredClientType = this.#projectManager.currentProjectIsRemote ? "studio-client" : "studio-host";

		if (this.#studioConnectionsManager && (!desiredClientType || desiredClientType != this.#studioConnectionsManager.clientType)) {
			this.#studioConnectionsManager.destructor();
			this.#studioConnectionsManager = null;
			this.#discoveryManagerInternal = null;
			this.#discoveryManagerWebRtc = null;
		}

		if (desiredClientType && !this.#studioConnectionsManager && this.#projectManager.currentProjectFileSystem) {
			/** @type {StudioConnectionsManager<ReturnType<createStudioHostHandlers>, ReturnType<createStudioHostHandlers>>?} */
			const studioConnectionsManager = new StudioConnectionsManager(desiredClientType, createStudioHostHandlers(this.#projectManager.currentProjectFileSystem));
			this.#studioConnectionsManager = studioConnectionsManager;
			this.#lastSentProjectMetaData = null;
			studioConnectionsManager.onConnectionsChanged(() => {
				if (studioConnectionsManager != this.#studioConnectionsManager) {
					throw new Error("Assertion failed, studio connections manager callback fired after it has been destructed.");
				}
				this.#onConnectionsChangedCbs.forEach(cb => cb());
			});
			studioConnectionsManager.onConnectionCreated(connection => {
				if (studioConnectionsManager != this.#studioConnectionsManager) {
					throw new Error("Assertion failed, studio connections manager callback fired after it has been destructed.");
				}

				let initiatorType;
				let receiverType;
				if (connection.initiatedByMe) {
					initiatorType = studioConnectionsManager.clientType;
					receiverType = connection.clientType;
				} else {
					initiatorType = connection.clientType;
					receiverType = studioConnectionsManager.clientType;
				}

				if (!this.#isValidConnectionConfiguration(initiatorType, receiverType)) {
					throw new Error(`Assertion failed, tried to connect two connections that are incompatible: "${initiatorType}" tried to connect to "${receiverType}"`);
				}

				// TODO: Add an allowlist #751

				return true;
			});
		}
		if (this.#studioConnectionsManager) {
			// create/destroy internal discovery manager when needed
			const needsInternalDiscovery = allowInternalIncoming || this.#projectManager.currentProjectIsRemote;
			if (this.#discoveryManagerInternal && !needsInternalDiscovery) {
				this.#studioConnectionsManager.removeDiscoveryManager(this.#discoveryManagerInternal);
			} else if (!this.#discoveryManagerInternal && needsInternalDiscovery) {
				this.#discoveryManagerInternal = this.#studioConnectionsManager.addDiscoveryManager(DiscoveryManagerInternal, this.#getDefaultInternalDiscoveryEndPoint());
			}

			// create/destroy webrtc discovery manager when needed
			const needsWebRtcDiscovery = allowRemoteIncoming || this.#projectManager.currentProjectIsRemote;
			const desiredWebRtcEndpoint = this.#webRtcDiscoveryEndpoint || this.getDefaultWebRtcDiscoveryEndPoint();
			if (this.#discoveryManagerWebRtc && (!needsWebRtcDiscovery || this.#discoveryManagerWebRtc.endpoint != desiredWebRtcEndpoint)) {
				this.#studioConnectionsManager.removeDiscoveryManager(this.#discoveryManagerWebRtc);
				this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb("disconnected"));
				this.#discoveryManagerWebRtc = null;
			}
			if (!this.#discoveryManagerWebRtc && needsWebRtcDiscovery) {
				this.#discoveryManagerWebRtc = this.#studioConnectionsManager.addDiscoveryManager(DiscoveryManagerWebRtc, {
					endpoint: desiredWebRtcEndpoint,
				});
				this.#discoveryManagerWebRtc.onStatusChange(status => {
					this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
				});
				const status = this.#discoveryManagerWebRtc.status;
				this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
			}
		}

		this.#updateProjectMetaData();
	};

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} oldData
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} newData
	 */
	#metaDataEquals(oldData, newData) {
		if (oldData == newData) return true;
		if (
			newData && oldData &&
			oldData.name == newData.name &&
			oldData.uuid == newData.uuid &&
			oldData.fileSystemHasWritePermissions == newData.fileSystemHasWritePermissions
		) return true;

		return false;
	}

	/**
	 * Sends the current state of project metadata to remote and internal studio connections.
	 */
	#updateProjectMetaData() {
		if (!this.#studioConnectionsManager) return;
		const metaData = this.#projectManager.getCurrentProjectMetaData();
		if (this.#metaDataEquals(metaData, this.#lastSentProjectMetaData)) return;
		this.#studioConnectionsManager.setProjectMetaData(metaData);
	}

	/**
	 * @param {string?} endpoint
	 */
	setWebRtcDiscoveryEndpoint(endpoint) {
		this.#webRtcDiscoveryEndpoint = endpoint;
		this.#updateStudioConnectionsManager();
	}

	/** @type {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js").DiscoveryServerStatusType} */
	get webRtcDiscoveryServerStatus() {
		if (!this.#discoveryManagerWebRtc) return "disconnected";
		return this.#discoveryManagerWebRtc.status;
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js").OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	onWebRtcDiscoveryServerStatusChange(cb) {
		this.#onWebRtcDiscoveryServerStatusChangeCbs.add(cb);
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js").OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	removeOnWebRtcDiscoveryServerStatusChange(cb) {
		this.#onWebRtcDiscoveryServerStatusChangeCbs.delete(cb);
	}

	*availableConnections() {
		if (!this.#studioConnectionsManager) return;
		for (const connection of this.#studioConnectionsManager.availableConnections()) {
			// Studio clients can never be connected to.
			// Their connection can only be initiated from the client.
			// Studio client connections will not be able to connect to other client connections either,
			// so it's safe to filter them away completely.
			if (connection.clientType != "studio-client") {
				yield connection;
			}
		}
	}

	/**
	 * Attempts to initiate a new connection.
	 * If the connection succeeds, state changes can be observed using {@linkcode onConnectionsChanged}.
	 * @param {import("../../../../src/mod.js").UuidString} id
	 */
	requestConnection(id) {
		if (!this.#studioConnectionsManager) {
			throw new Error("Assertion failed, studio connections manager does not exist");
		}
		this.#studioConnectionsManager.requestConnection(id);
	}

	/**
	 * @param {() => void} cb
	 */
	onConnectionsChanged(cb) {
		this.#onConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnConnectionsChanged(cb) {
		this.#onConnectionsChangedCbs.delete(cb);
	}
}
