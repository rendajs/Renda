import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import {ContentWindow} from "./ContentWindow.js";

/**
 * @typedef {object} ConectionGui
 * @property {PropertiesTreeView<any>} treeView
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/LabelGui.js").LabelGui>} statusLabel
 * @property {import("../../ui/Button.js").Button} connectButton
 */

export class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:connections");
	static contentWindowUiName = "Connections";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/connections.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.addPreferencesButton([
			"studioConnections.allowInternalIncoming",
			"studioConnections.allowRemoteIncoming",
		]);

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.studioConnectionGuis = new Map();
		this.inspectorConnectionGuis = new Map();

		const {discoveryServerStatusLabel} = this.createHeaderUi();
		this.discoveryServerStatusLabel = discoveryServerStatusLabel;

		const {studioClientConnectionTreeView, studioConnectionsList} = this.createClientConnectionUi();
		this.studioClientConnectionTreeView = studioClientConnectionTreeView;
		this.studioConnectionsList = studioConnectionsList;

		const {inspectorConnectionsList} = this.createInspectorConnectionsUi();
		this.inspectorConnectionsList = inspectorConnectionsList;

		const connectionsManager = this.studioInstance.studioConnectionsManager;
		connectionsManager.onWebRtcDiscoveryServerStatusChange(this.#updateWebRtcDiscoveryServerStatus);

		connectionsManager.onConnectionsChanged(this.#updateConnectionLists);

		this.#updateWebRtcDiscoveryServerStatus(connectionsManager.webRtcDiscoveryServerStatus);

		this.#updateConnectionLists();
	}

	destructor() {
		const connectionsManager = this.studioInstance.studioConnectionsManager;
		connectionsManager.removeOnWebRtcDiscoveryServerStatusChange(this.#updateWebRtcDiscoveryServerStatus);
		connectionsManager.removeOnConnectionsChanged(this.#updateConnectionLists);
	}

	createHeaderUi() {
		const discoveryServerEndpointField = this.headerTreeView.addItem({
			type: "string",
			/** @type {import("../../ui/TextGui.js").TextGuiOptions} */
			guiOpts: {
				label: "Discovery Server",
				placeholder: this.studioInstance.studioConnectionsManager.getDefaultWebRtcDiscoveryEndPoint(),
			},
		});
		discoveryServerEndpointField.onValueChange(changeEvent => {
			this.studioInstance.studioConnectionsManager.setWebRtcDiscoveryEndpoint(changeEvent.value);
		});
		const discoveryServerStatusLabel = this.headerTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});
		return {discoveryServerStatusLabel};
	}

	createClientConnectionUi() {
		const studioClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(studioClientConnectionTreeView.el);

		// todo: add status label for client connection

		const studioConnectionsList = studioClientConnectionTreeView.addCollapsable("Studios");
		return {studioClientConnectionTreeView, studioConnectionsList};
	}

	createInspectorConnectionsUi() {
		const inspectorConnectionsTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(inspectorConnectionsTreeView.el);

		// todo: make this work
		// this.autoConnectInspectorsCheckbox = inspectorConnectionsTreeView.addItem({
		// 	type: "boolean",
		// 	/** @type {import("../../UI/BooleanGui.js").BooleanGuiOptions} */
		// 	guiOpts: {
		// 		label: "Auto Connect Inspectors",
		// 	},
		// });

		const inspectorConnectionsList = inspectorConnectionsTreeView.addCollapsable("Inspectors");
		return {inspectorConnectionsList};
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js").DiscoveryServerStatusType} status
	 */
	#updateWebRtcDiscoveryServerStatus = status => {
		this.discoveryServerStatusLabel.setValue(status);
	};

	#updateConnectionLists = () => {
		const connections = Array.from(this.studioInstance.studioConnectionsManager.availableConnections());
		this.updateConnectionsList(this.studioConnectionGuis, this.studioConnectionsList, connections, "studio-host");
		this.updateConnectionsList(this.inspectorConnectionGuis, this.inspectorConnectionsList, connections, "inspector");
	};

	/**
	 * @param {Map<string, ConectionGui>} guisList
	 * @param {PropertiesTreeView<any>} listTreeView
	 * @param {import("../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").AvailableConnectionData[]} connections
	 * @param {import("../../../../src/network/studioConnections/StudioConnectionsManager.js").ClientType} allowedClientType
	 */
	updateConnectionsList(guisList, listTreeView, connections, allowedClientType) {
		const removeGuiIds = new Set(guisList.keys());
		for (const connection of connections) {
			if (connection.clientType != allowedClientType) continue;

			let gui = guisList.get(connection.id);
			if (!gui) {
				const treeView = listTreeView.addCollapsable();
				treeView.renderContainer = true;
				const connectionTypeLabel = treeView.addItem({
					type: "label",
					guiOpts: {
						label: "Connection Type",
						showLabelBackground: false,
					},
				});
				if (connection.connectionType == "renda:internal") {
					connectionTypeLabel.setValue("Internal");
				} else if (connection.connectionType == "renda:webrtc") {
					connectionTypeLabel.setValue("WebRTC");
				} else {
					connectionTypeLabel.setValue(connection.connectionType);
				}
				const statusLabel = treeView.addItem({
					type: "label",
					guiOpts: {
						label: "Status",
					},
				});

				const buttonTreeView = treeView.addItem({
					type: "button",
					guiOpts: {
						label: "Connect",
						text: "Connect",
						onClick: () => {
							this.studioInstance.studioConnectionsManager.requestConnection(connection.id);
						},
					},
				});
				const connectButton = buttonTreeView.gui;

				gui = {treeView, statusLabel, connectButton};
				guisList.set(connection.id, gui);
			}

			removeGuiIds.delete(connection.id);

			const projectMetaData = connection.projectMetaData;
			if (projectMetaData) {
				gui.treeView.name = projectMetaData.name || "Untitled Project";
			} else {
				gui.treeView.name = "Studio";
			}

			let available = false;
			let status = "Unavailable";
			let tooltip = "";
			if (projectMetaData) {
				if (projectMetaData.fileSystemHasWritePermissions) {
					available = true;
					status = "Available";
				} else {
					status = "No Filesystem permissions";
					tooltip = "The other studio instance hasn't approved file system permissions in its tab yet.";
				}
			}

			if (available) {
				const activeConnection = connections.get(connection.id);
				if (activeConnection) {
					if (activeConnection.connectionState == "connecting") {
						status = "Connecting";
					} else if (activeConnection.connectionState == "connected") {
						status = "Connected";
					} else if (activeConnection.connectionState == "disconnected") {
						status = "Offline";
					}
					available = false;
				}
			} else {
				tooltip = "The other studio instance either doesn't have a project open or has disabled incoming connections in its connections window.";
			}
			gui.connectButton.setDisabled(!available);
			gui.statusLabel.setValue(status);
			gui.statusLabel.gui.tooltip = tooltip;
		}

		for (const removeGuiId of removeGuiIds) {
			const gui = guisList.get(removeGuiId);
			if (gui) {
				listTreeView.removeChild(gui.treeView);
			}
			guisList.delete(removeGuiId);
		}
	}
}
