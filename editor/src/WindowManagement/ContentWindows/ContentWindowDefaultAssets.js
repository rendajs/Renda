import ContentWindow from "./ContentWindow.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";

export default class ContentWindowDefaultAssets extends ContentWindow{

	static windowName = "defaultAssets";

	constructor(){
		super();

		this.treeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.generateFromSerializableStructure({
			defaultAssets: {
				type: Array,
				arrayOpts: {
					type: {
						name: {type: String},
						asset: {type: ProjectAsset},
						defaultAsset: {type: ProjectAsset},
					},
				},
			},
		});
	}
}
