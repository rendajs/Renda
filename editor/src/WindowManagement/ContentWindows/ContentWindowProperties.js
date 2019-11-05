import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";

export default class ContentWindowProperties extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView({
			name: "test1",
			children:[
				{name:"test2"},
				{name:"test3"},
				{
					name:"test4",
					collapsed: true,
					children:[
						{name:"a"},
						{name:"b"},
						{name:"c"},
					],
				},
				{name:"test5"},
				{name:"test6"},
			],
		});
		this.contentEl.appendChild(this.treeView.el);

		this.linkedObject = null;
	}

	static get windowName(){
		return "Properties";
	}
}
