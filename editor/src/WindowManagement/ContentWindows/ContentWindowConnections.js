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

		this.editorHostConnectionTreeView.visible = !editor.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = editor.projectManager.currentProjectIsRemote;

		editor.projectManager.onCurrentEditorConnectionsManagerChanged(newConnectionsManager => {
			this.addConnectionsManagerListeners(newConnectionsManager);
		});
		this.addConnectionsManagerListeners(editor.projectManager.editorConnectionsManager);
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

	async loadSettings() {
		this.allowIncomingCheckbox.setValue(await editor.projectManager.getEditorConnectionsAllowIncoming());
	}

	/**
	 * @param {?EditorConnectionsManager} connectionsManager
	 */
	addConnectionsManagerListeners(connectionsManager) {
		if (!connectionsManager) return;

		this.updateDiscoveryServerStatus(connectionsManager.discoveryServerStatus);
		connectionsManager.onDiscoveryServerStatusChange(status => {
			this.updateDiscoveryServerStatus(status);
		});

		if (editor.projectManager.currentProjectIsRemote) {
			connectionsManager.onAvailableRtcConnectionsChanged(editors => {
				this.setRemoteEditorsList(editors);
			});
		}
	}

	/**
	 *
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").DiscoveryServerStatusType} status
	 */
	updateDiscoveryServerStatus(status) {
		this.discoveryServerStatusLabel.setValue(status);
	}

	/**
	 * @param {import("../../Network/EditorConnections/EditorConnectionsManager.js").AvailableEditorDataList} editors
	 */
	setRemoteEditorsList(editors) {
		this.remoteEditorsList.clearChildren();
		for (const editorData of editors.values()) {
			const gui = this.remoteEditorsList.addCollapsable(editorData.id);
			gui.addItem({
				type: "button",
				/** @type {import("../../UI/Button.js").ButtonGuiOptions} */
				guiOpts: {
					label: "Connect",
					text: "Connect",
					onClick: () => {
						editor.projectManager.editorConnectionsManager.startRtcConnection(editorData.id);
					},
				},
			});
		}
	}
}
