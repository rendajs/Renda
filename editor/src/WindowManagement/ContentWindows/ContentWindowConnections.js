import editor from "../../editorInstance.js";
import EditorConnectionServer from "../../Network/EditorConnectionServer.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ContentWindow from "./ContentWindow.js";

export default class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";

	/** @typedef {import("../../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} PropertiesTreeViewStructure */

	constructor() {
		super();

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.discoveryServerEndpointField = this.headerTreeView.addItem({
			type: String,
			/** @type {import("../../UI/TextGui.js").TextGuiOptions} */
			guiOpts: {
				label: "Discovery Server",
				placeholder: EditorConnectionServer.getDefaultEndPoint(),
			},
		});
		this.discoveryServerEndpointField.onValueChange(() => {
			this.updateConnectionServer();
		});
		this.discoveryServerStatusLabel = this.headerTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});

		this.editorHostConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorHostConnectionTreeView.el);
		this.allowIncomingCheckbox = this.editorHostConnectionTreeView.addItem({
			type: Boolean,
			/** @type {import("../../UI/BooleanGui.js").BooleanGuiOptions} */
			guiOpts: {
				label: "Allow Incoming Connections",
			},
		});
		this.allowIncomingCheckbox.onValueChange(() => {
			this.updateConnectionServer();
		});

		this.editorClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorClientConnectionTreeView.el);

		this.editorHostConnectionTreeView.visible = !editor.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = editor.projectManager.currentProjectIsRemote;
	}

	updateConnectionServer() {
		const allowIncoming = this.allowIncomingCheckbox.getValue();

		let endpoint = null;
		if (allowIncoming) {
			endpoint = this.discoveryServerEndpointField.getValue();
			if (!endpoint) endpoint = EditorConnectionServer.getDefaultEndPoint();
		}
		editor.projectManager.setEditorConnectionServerEndpoint(endpoint);
	}
}
