import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";

export default class ContentWindowOutliner extends ContentWindow{
	constructor(editor){
		super(editor);

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

		this.el.appendChild(this.treeView.el);
	}

	static get windowName(){
		return "Outliner";
	}
}
