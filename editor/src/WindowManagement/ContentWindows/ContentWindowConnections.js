import editor from "../../editorInstance.js";
import EditorConnectionServer from "../../Network/EditorConnectionServer.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ContentWindow from "./ContentWindow.js";

export default class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = "connections";
	static contentWindowUiName = "Connections";

	constructor() {
		super();

		this.editorConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.editorConnectionTreeView.el);

		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} */
		this.editorConnectionServerGuiStructure = {
			allowConnections: {
				type: Boolean,
			},
			discoveryServer: {
				type: String,
				/** @type {import("../../UI/TextGui.js").TextGuiOptions} */
				guiOpts: {
					placeholder: EditorConnectionServer.getDefaultEndPoint(),
				},
			},
		};
		this.editorConnectionTreeView.generateFromSerializableStructure(this.editorConnectionServerGuiStructure);
		this.editorConnectionTreeView.onChildValueChange(() => {
			const guiValues = this.editorConnectionTreeView.getSerializableStructureValues(this.editorConnectionServerGuiStructure);
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
	}
}
