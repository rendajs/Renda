import EditorWindowSplit from "./EditorWindowSplit.js";
import EditorWindowTabs from "./EditorWindowTabs.js";

export default class WindowManager{
	constructor(){
		this.rootWindow = null;

		this.loadWorkspace({
			windows: [
				{
					tabs:[
						{type: "empty"},
						{type: "empty"},
						{type: "empty"},
					]
				}
			]
		});
	}

	loadWorkspace(workspace){
		this.rootWindow = new EditorWindowSplit();
		this.rootWindow.isHorizontal = true;
		this.rootWindow.windowA = new EditorWindowSplit();
		this.rootWindow.windowA.isHorizontal = false;
		this.rootWindow.windowA.splitPercentage = 0.8;
		this.rootWindow.windowA.windowA = new EditorWindowSplit();
		this.rootWindow.windowA.windowA.isHorizontal = true;
		this.rootWindow.windowA.windowA.windowA = new EditorWindowTabs();
		this.rootWindow.windowA.windowA.windowB = new EditorWindowTabs();
		this.rootWindow.windowA.windowB = new EditorWindowTabs();
		this.rootWindow.windowB = new EditorWindowTabs();
		this.rootWindow.setRoot();

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
	}
}
