import {EditorConnectionsManager} from "../../network/editorConnections/EditorConnectionsManager.js";
import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import {ContentWindow} from "./ContentWindow.js";

/**
 * @typedef {Object} ConectionGui
 * @property {PropertiesTreeView<any>} treeView
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/LabelGui.js").LabelGui>} statusLabel
 */

export class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";
	static contentWindowUiIcon = "icons/contentWindowTabs/connections.svg";

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
				placeholder: EditorConnectionsManager.getDefaultEndPoint(),
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
	 *
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

				treeView.addItem({
					type: "button",
					guiOpts: {
						label: "Connect",
						text: "Connect",
						onClick: () => {
							this.editorInstance.projectManager.editorConnectionsManager.startConnection(connection.id);
						},
					},
				});

				gui = {treeView, statusLabel};
				guisList.set(connection.id, gui);
			}

			removeGuiIds.delete(connection.id);

			gui.treeView.name = connection?.projectMetaData?.name || "Unnamed Project";

			const activeConnection = activeConnections.get(connection.id);
			let status = "Available";
			if (activeConnection) {
				if (activeConnection.connectionState == "connecting") {
					status = "Connecting";
				} else if (activeConnection.connectionState == "connected") {
					status = "Connected";
				} else if (activeConnection.connectionState == "disconnected") {
					status = "Offline";
				}
			}
			gui.statusLabel.setValue(status);
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
