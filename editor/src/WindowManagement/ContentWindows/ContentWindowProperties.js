import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";

export default class ContentWindowProperties extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.contentEl.appendChild(this.treeView.el);
	}

	static get windowName(){
		return "Properties";
	}

	showSelectedObjectProperties(selectedObjects){
		let componentList = [];
		for(const object of selectedObjects){
			for(const component of object.components){
				componentList.push({
					type: component.constructor,
					instances: [component],
				});
			}
		}
		let treeData = {
			name: "components",
			children: componentList.map(c => {
				return {
					name: c.type.name,
				}
			}),
		}
		this.treeView.updateData(treeData);
		this.treeView.setRowVisible(false);
	}
}
