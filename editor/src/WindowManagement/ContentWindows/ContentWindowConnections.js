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

		/** @type {PropertiesTreeViewStructure} */
		this.headerGuiStructure = {
			discoveryServer: {
				type: String,
				/** @type {import("../../UI/TextGui.js").TextGuiOptions} */
				guiOpts: {
					placeholder: EditorConnectionServer.getDefaultEndPoint(),
				},
			},
		};
		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);
		this.headerTreeView.generateFromSerializableStructure(this.headerGuiStructure);

		/** @type {PropertiesTreeViewStructure} */
		this.editorHostConnectionServerGuiStructure = {
			allowIncomingConnections: {
				type: Boolean,
			},
		};
		this.editorHostConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorHostConnectionTreeView.el);
		this.editorHostConnectionTreeView.generateFromSerializableStructure(this.editorHostConnectionServerGuiStructure);
		this.editorHostConnectionTreeView.onChildValueChange(() => {
			const guiValues = this.editorHostConnectionTreeView.getSerializableStructureValues(this.editorHostConnectionServerGuiStructure);
			let endPoint = null;
			if (guiValues.allowConnections) {
				if (guiValues.discoveryServer) {
					endPoint = guiValues.discoveryServer;
				} else {
					endPoint = EditorConnectionServer.getDefaultEndPoint();
				}
			}
			editor.projectManager.setEditorConnectionServerEndpoint(endPoint);
		});

		/** @type {PropertiesTreeViewStructure} */
		this.editorClientConnectionGuiStructure = {
			test: {
				type: Boolean,
			},
		};
		this.editorClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorClientConnectionTreeView.el);
		this.editorClientConnectionTreeView.generateFromSerializableStructure(this.editorClientConnectionGuiStructure);

		this.editorHostConnectionTreeView.visible = !editor.projectManager.currentProjectIsRemote;
		this.editorClientConnectionTreeView.visible = editor.projectManager.currentProjectIsRemote;
	}
}
