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

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.studioConnectionGuis = new Map();
		this.inspectorConnectionGuis = new Map();

		const {discoveryServerStatusLabel} = this.createHeaderUi();
		this.discoveryServerStatusLabel = discoveryServerStatusLabel;

		const {studioHostConnectionTreeView, allowRemoteIncomingCheckbox, allowInternalIncomingCheckbox} = this.createHostConnectionsUi();
		this.studioHostConnectionTreeView = studioHostConnectionTreeView;
		this.allowRemoteIncomingCheckbox = allowRemoteIncomingCheckbox;
		this.allowInternalIncomingCheckbox = allowInternalIncomingCheckbox;

		const {studioClientConnectionTreeView, studioConnectionsList} = this.createClientConnectionUi();
		this.studioClientConnectionTreeView = studioClientConnectionTreeView;
		this.studioConnectionsList = studioConnectionsList;

		const {inspectorConnectionsList} = this.createInspectorConnectionsUi();
		this.inspectorConnectionsList = inspectorConnectionsList;

		this.studioHostConnectionTreeView.visible = !this.studioInstance.projectManager.currentProjectIsRemote;
		this.studioClientConnectionTreeView.visible = this.studioInstance.projectManager.currentProjectIsRemote;

		const connectionsManager = this.studioInstance.projectManager.studioConnectionsManager;
		this.updateDiscoveryServerStatus(connectionsManager.discoveryServerStatus);
		/**
		 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").DiscoveryServerStatusType} status
		 */
		this.boundUpdateDiscoveryServerStatus = status => {
			this.updateDiscoveryServerStatus(status);
		};
		connectionsManager.onDiscoveryServerStatusChange(this.boundUpdateDiscoveryServerStatus);

		this.boundUpdateConnectionLists = () => {
			this.updateConnectionLists();
		};
		connectionsManager.onAvailableConnectionsChanged(this.boundUpdateConnectionLists);
		connectionsManager.onActiveConnectionsChanged(this.boundUpdateConnectionLists);

		this.updateDiscoveryServerStatus("disconnected");

		this.loadSettings();
		this.updateConnectionLists();
	}

	destructor() {
		const connectionsManager = this.studioInstance.projectManager.studioConnectionsManager;
		connectionsManager.removeOnDiscoveryServerStatusChange(this.boundUpdateDiscoveryServerStatus);
		connectionsManager.removeOnAvailableConnectionsChanged(this.boundUpdateConnectionLists);
		connectionsManager.removeOnActiveConnectionsChanged(this.boundUpdateConnectionLists);
	}

	createHeaderUi() {
		const discoveryServerEndpointField = this.headerTreeView.addItem({
			type: "string",
			/** @type {import("../../ui/TextGui.js").TextGuiOptions} */
			guiOpts: {
				label: "Discovery Server",
				placeholder: this.studioInstance.projectManager.studioConnectionsManager.getDefaultEndPoint(),
			},
		});
		discoveryServerEndpointField.onValueChange(changeEvent => {
			this.studioInstance.projectManager.setStudioConnectionsDiscoveryEndpoint(changeEvent.value);
		});
		const discoveryServerStatusLabel = this.headerTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});
		return {discoveryServerStatusLabel};
	}

	createHostConnectionsUi() {
		const studioHostConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(studioHostConnectionTreeView.el);

		const allowRemoteIncomingCheckbox = studioHostConnectionTreeView.addItem({
			type: "boolean",
			/** @type {import("../../ui/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Remote Incoming Connections",
			},
		});
		allowRemoteIncomingCheckbox.onValueChange(changeEvent => {
			this.studioInstance.projectManager.setStudioConnectionsAllowRemoteIncoming(changeEvent.value);
		});

		const allowInternalIncomingCheckbox = studioHostConnectionTreeView.addItem({
			type: "boolean",
			/** @type {import("../../ui/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Internal Incoming Connections",
			},
		});
		allowInternalIncomingCheckbox.onValueChange(changeEvent => {
			this.studioInstance.projectManager.setStudioConnectionsAllowInternalIncoming(changeEvent.value);
		});

		return {studioHostConnectionTreeView, allowRemoteIncomingCheckbox, allowInternalIncomingCheckbox};
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

	async loadSettings() {
		this.allowRemoteIncomingCheckbox.setValue(await this.studioInstance.projectManager.getStudioConnectionsAllowRemoteIncoming());
		this.allowInternalIncomingCheckbox.setValue(await this.studioInstance.projectManager.getStudioConnectionsAllowInternalIncoming());
	}

	/**
	 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").DiscoveryServerStatusType} status
	 */
	updateDiscoveryServerStatus(status) {
		this.discoveryServerStatusLabel.setValue(status);
	}

	updateConnectionLists() {
		const {availableConnections, activeConnections} = this.studioInstance.projectManager.studioConnectionsManager;
		this.updateConnectionsList(this.studioConnectionGuis, this.studioConnectionsList, availableConnections, activeConnections, "studio");
		this.updateConnectionsList(this.inspectorConnectionGuis, this.inspectorConnectionsList, availableConnections, activeConnections, "inspector");
	}

	/**
	 * @param {Map<string, ConectionGui>} guisList
	 * @param {PropertiesTreeView<any>} listTreeView
	 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} availableConnections
	 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").ActiveStudioDataList} activeConnections
	 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").ClientType} allowedClientType
	 */
	updateConnectionsList(guisList, listTreeView, availableConnections, activeConnections, allowedClientType) {
		const removeGuiIds = new Set(guisList.keys());
		for (const connection of availableConnections.values()) {
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
				if (connection.messageHandlerType == "internal") {
					connectionTypeLabel.setValue("Internal");
				} else if (connection.messageHandlerType == "webRtc") {
					connectionTypeLabel.setValue("WebRTC");
				} else {
					connectionTypeLabel.setValue("Unknown");
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
							this.studioInstance.projectManager.studioConnectionsManager.startConnection(connection.id);
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
					tooltip = "The other studio instance hasn't aproved file system permissions in its tab yet.";
				}
			}

			if (available) {
				const activeConnection = activeConnections.get(connection.id);
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
