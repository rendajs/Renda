import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import {ContentWindow} from "./ContentWindow.js";

/**
 * @typedef {object} ConectionGui
 * @property {PropertiesTreeView<any>} treeView
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/LabelGui.js").LabelGui>} statusLabel
 * @property {import("../../ui/Button.js").Button} connectButton
 */

export class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/connections.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.editorConnectionGuis = new Map();
		this.inspectorConnectionGuis = new Map();

		const {discoveryServerStatusLabel} = this.createHeaderUi();
		this.discoveryServerStatusLabel = discoveryServerStatusLabel;

		const {editorHostConnectionTreeView, allowRemoteIncomingCheckbox, allowInternalIncomingCheckbox} = this.createHostConnectionsUi();
		this.editorHostConnectionTreeView = editorHostConnectionTreeView;
		this.allowRemoteIncomingCheckbox = allowRemoteIncomingCheckbox;
		this.allowInternalIncomingCheckbox = allowInternalIncomingCheckbox;

		const {editorClientConnectionTreeView, editorConnectionsList} = this.createClientConnectionUi();
		this.editorClientConnectionTreeView = editorClientConnectionTreeView;
		this.editorConnectionsList = editorConnectionsList;

		const {inspectorConnectionsList} = this.createInspectorConnectionsUi();
		this.inspectorConnectionsList = inspectorConnectionsList;

		this.editorHostConnectionTreeView.visible = !this.editorInstance.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = this.editorInstance.projectManager.currentProjectIsRemote;

		const connectionsManager = this.editorInstance.projectManager.editorConnectionsManager;
		this.updateDiscoveryServerStatus(connectionsManager.discoveryServerStatus);
		/**
		 * @param {import("../../network/editorConnections/EditorConnectionsManager.js").DiscoveryServerStatusType} status
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
		const connectionsManager = this.editorInstance.projectManager.editorConnectionsManager;
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
				placeholder: this.editorInstance.projectManager.editorConnectionsManager.getDefaultEndPoint(),
			},
		});
		discoveryServerEndpointField.onValueChange(endPoint => {
			this.editorInstance.projectManager.setEditorConnectionsDiscoveryEndpoint(endPoint);
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
		const editorHostConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(editorHostConnectionTreeView.el);

		const allowRemoteIncomingCheckbox = editorHostConnectionTreeView.addItem({
			type: "boolean",
			/** @type {import("../../ui/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Remote Incoming Connections",
			},
		});
		allowRemoteIncomingCheckbox.onValueChange(allowIncoming => {
			this.editorInstance.projectManager.setEditorConnectionsAllowRemoteIncoming(allowIncoming);
		});

		const allowInternalIncomingCheckbox = editorHostConnectionTreeView.addItem({
			type: "boolean",
			/** @type {import("../../ui/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Internal Incoming Connections",
			},
		});
		allowInternalIncomingCheckbox.onValueChange(allowIncoming => {
			this.editorInstance.projectManager.setEditorConnectionsAllowInternalIncoming(allowIncoming);
		});

		return {editorHostConnectionTreeView, allowRemoteIncomingCheckbox, allowInternalIncomingCheckbox};
	}

	createClientConnectionUi() {
		const editorClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(editorClientConnectionTreeView.el);

		// todo: add status label for client connection

		const editorConnectionsList = editorClientConnectionTreeView.addCollapsable("Editors");
		return {editorClientConnectionTreeView, editorConnectionsList};
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
		this.allowRemoteIncomingCheckbox.setValue(await this.editorInstance.projectManager.getEditorConnectionsAllowRemoteIncoming());
		this.allowInternalIncomingCheckbox.setValue(await this.editorInstance.projectManager.getEditorConnectionsAllowInternalIncoming());
	}

	/**
	 * @param {import("../../network/editorConnections/EditorConnectionsManager.js").DiscoveryServerStatusType} status
	 */
	updateDiscoveryServerStatus(status) {
		this.discoveryServerStatusLabel.setValue(status);
	}

	updateConnectionLists() {
		const {availableConnections, activeConnections} = this.editorInstance.projectManager.editorConnectionsManager;
		this.updateConnectionsList(this.editorConnectionGuis, this.editorConnectionsList, availableConnections, activeConnections, "editor");
		this.updateConnectionsList(this.inspectorConnectionGuis, this.inspectorConnectionsList, availableConnections, activeConnections, "inspector");
	}

	/**
	 * @param {Map<string, ConectionGui>} guisList
	 * @param {PropertiesTreeView<any>} listTreeView
	 * @param {import("../../network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} availableConnections
	 * @param {import("../../network/editorConnections/EditorConnectionsManager.js").ActiveEditorDataList} activeConnections
	 * @param {import("../../network/editorConnections/EditorConnectionsManager.js").ClientType} allowedClientType
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
							this.editorInstance.projectManager.editorConnectionsManager.startConnection(connection.id);
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
				gui.treeView.name = "Editor";
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
					tooltip = "The other editor hasn't aproved file system permissions in its tab yet.";
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
				tooltip = "This editor either doesn't have a project open or has disabled incoming connections in its connections window.";
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
