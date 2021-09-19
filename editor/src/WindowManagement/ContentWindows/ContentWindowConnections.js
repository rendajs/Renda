import editor from "../../editorInstance.js";
import EditorConnectionsManager from "../../Network/EditorConnections/EditorConnectionsManager.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ContentWindow from "./ContentWindow.js";

export default class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";

	constructor() {
		super();

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.createHeaderUi();
		this.createHostConnectionsUi();
		this.createClientConnectionUi();
		this.createInspectorConnectionsUi();

		this.editorHostConnectionTreeView.visible = !editor.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = editor.projectManager.currentProjectIsRemote;

		const connectionsManager = editor.projectManager.editorConnectionsManager;
		this.updateDiscoveryServerStatus(connectionsManager.discoveryServerStatus);
		connectionsManager.onDiscoveryServerStatusChange(status => {
			this.updateDiscoveryServerStatus(status);
		});

		connectionsManager.onAvailableConnectionsChanged(connections => {
			this.setConnectionLists(connections);
		});

		this.updateDiscoveryServerStatus("disconnected");

		this.loadSettings();
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

		this.remoteEditorsList = this.editorClientConnectionTreeView.addCollapsable("Editors");
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

	/**
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").AvailableEditorDataList} connections
	 */
	setConnectionLists(connections) {
		this.remoteEditorsList.clearChildren();
		for (const connection of connections.values()) {
			if (connection.connectionType == "editor") {
				const gui = this.remoteEditorsList.addCollapsable(connection.id);
				gui.addItem({
					type: "button",
					/** @type {import("../../UI/Button.js").ButtonGuiOptions} */
					guiOpts: {
						label: "Connect",
						text: "Connect",
						onClick: () => {
							editor.projectManager.editorConnectionsManager.startRtcConnection(connection.id);
						},
					},
				});
			}
		}

		this.inspectorConnectionsList.clearChildren();
		for (const connection of connections.values()) {
			if (connection.connectionType == "inspector") {
				const gui = this.inspectorConnectionsList.addCollapsable(connection.id);
				gui.addItem({
					type: "button",
					/** @type {import("../../UI/Button.js").ButtonGuiOptions} */
					guiOpts: {
						label: "Connect",
						text: "Connect",
						onClick: () => {
							editor.projectManager.editorConnectionsManager.startMessagePortConnection(connection.id);
						},
					},
				});
			}
		}
	}
}
