import editor from "../../editorInstance.js";
import EditorConnectionsManager from "../../Network/EditorConnections/EditorConnectionsManager.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ContentWindow from "./ContentWindow.js";

/**
 * @typedef {Object} ConectionGui
 * @property {PropertiesTreeView} treeView
 * @property {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").default} statusLabel
 */

export default class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";

	constructor() {
		super();

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.editorConnectionGuis = new Map();
		this.inspectorConnectionGuis = new Map();

		this.createHeaderUi();
		this.createHostConnectionsUi();
		this.createClientConnectionUi();
		this.createInspectorConnectionsUi();

		this.editorHostConnectionTreeView.visible = !editor.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = editor.projectManager.currentProjectIsRemote;

		const connectionsManager = editor.projectManager.editorConnectionsManager;
		this.updateDiscoveryServerStatus(connectionsManager.discoveryServerStatus);
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
	}

	destructor() {
		const connectionsManager = editor.projectManager.editorConnectionsManager;
		connectionsManager.removeOnDiscoveryServerStatusChange(this.boundUpdateDiscoveryServerStatus);
		connectionsManager.removeOnAvailableConnectionsChanged(this.boundUpdateConnectionLists);
		connectionsManager.removeOnActiveConnectionsChanged(this.boundUpdateConnectionLists);
	}

	createHeaderUi() {
		this.discoveryServerEndpointField = this.headerTreeView.addItem({
			type: String,
			/** @type {import("../../UI/TextGui.js").TextGuiOptions} */
			guiOpts: {
				label: "Discovery Server",
				placeholder: EditorConnectionsManager.getDefaultEndPoint(),
			},
		});
		this.discoveryServerEndpointField.onValueChange(endPoint => {
			editor.projectManager.setEditorConnectionsDiscoveryEndpoint(endPoint);
		});
		this.discoveryServerStatusLabel = this.headerTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});
	}

	createHostConnectionsUi() {
		this.editorHostConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorHostConnectionTreeView.el);
		this.allowIncomingCheckbox = this.editorHostConnectionTreeView.addItem({
			type: Boolean,
			/** @type {import("../../UI/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Incoming Connections",
			},
		});
		this.allowIncomingCheckbox.onValueChange(allowIncoming => {
			editor.projectManager.setEditorConnectionsAllowIncoming(allowIncoming);
		});
	}

	createClientConnectionUi() {
		this.editorClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorClientConnectionTreeView.el);

		this.clientConnectionStatusLabel = this.editorClientConnectionTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});

		this.editorConnectionsList = this.editorClientConnectionTreeView.addCollapsable("Editors");
	}

	createInspectorConnectionsUi() {
		this.inspectorConnectionsTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.inspectorConnectionsTreeView.el);

		this.autoConnectInspectorsCheckbox = this.inspectorConnectionsTreeView.addItem({
			type: Boolean,
			/** @type {import("../../UI/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Auto Connect Inspectors",
			},
		});

		this.inspectorConnectionsList = this.inspectorConnectionsTreeView.addCollapsable("Inspectors");
	}

	async loadSettings() {
		this.allowIncomingCheckbox.setValue(await editor.projectManager.getEditorConnectionsAllowIncoming());
	}

	/**
	 *
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").DiscoveryServerStatusType} status
	 */
	updateDiscoveryServerStatus(status) {
		this.discoveryServerStatusLabel.setValue(status);
	}

	updateConnectionLists() {
		const {availableConnections, activeConnections} = editor.projectManager.editorConnectionsManager;
		this.updateConnectionsList(this.editorConnectionGuis, this.editorConnectionsList, availableConnections, activeConnections, "editor");
		this.updateConnectionsList(this.inspectorConnectionGuis, this.inspectorConnectionsList, availableConnections, activeConnections, "inspector");
	}

	/**
	 * @param {Map<string, ConectionGui>} guisList
	 * @param {PropertiesTreeView} listTreeView
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").AvailableEditorDataList} availableConnections
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").ActiveEditorDataList} activeConnections
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").ClientType} allowedClientType
	 */
	updateConnectionsList(guisList, listTreeView, availableConnections, activeConnections, allowedClientType) {
		const removeGuis = new Set(guisList.keys());
		for (const connection of availableConnections.values()) {
			if (connection.clientType != allowedClientType) continue;

			let gui = guisList.get(connection.id);
			if (!gui) {
				const treeView = listTreeView.addCollapsable(connection.id);
				const connectionTypeLabel = treeView.addItem({
					type: "label",
					/** @type {import("../../UI/LabelGui.js").LabelGuiOptions} */
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
					/** @type {import("../../UI/LabelGui.js").LabelGuiOptions} */
					guiOpts: {
						label: "Status",
					},
				});

				treeView.addItem({
					type: "button",
					/** @type {import("../../UI/Button.js").ButtonGuiOptions} */
					guiOpts: {
						label: "Connect",
						text: "Connect",
						onClick: () => {
							editor.projectManager.editorConnectionsManager.startConnection(connection.id);
						},
					},
				});

				gui = {treeView, statusLabel};
				guisList.set(connection.id, gui);
			}

			removeGuis.delete(connection.id);

			const activeConnection = activeConnections.get(connection.id);
			let status = "Available";
			if (activeConnection) {
				if (activeConnection.connectionState == "connecting") {
					status = "Connecting";
				} else if (activeConnection.connectionState == "connected") {
					status = "Connected";
				} else if (activeConnection.connectionState == "offline") {
					status = "Offline";
				}
			}
			gui.statusLabel.setValue(status);
		}
	}
}
