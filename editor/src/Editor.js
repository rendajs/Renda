import WindowManager from "./WindowManagement/WindowManager.js";
import PropertiesWindowContentManager from "./Managers/PropertiesWindowContentManager.js";
import ProjectManager from "./Managers/ProjectManager.js";
import * as GameEngine from "../../src/index.js";

export default class Editor{
	constructor(){
		this.renderer = new GameEngine.RealTimeRenderer();
		this.windowManager = new WindowManager();
		this.propertiesWindowContentManager = new PropertiesWindowContentManager();
		this.projectManager = new ProjectManager();
	}

	//convenience function for getting selected object in the browser console
	get selected(){
		//todo: get selection manager from active window, once that's implemented
		let selected = this.windowManager.rootWindow.windowB.windowA.windowA.tabs[0].selectionManager.currentSelectedObjects;
		if(selected.length == 0) return null;
		if(selected.length == 1) return selected[0];
		return [...selected];
	}

	init(){
		this.renderer.init();
		this.windowManager.init(this);
		this.propertiesWindowContentManager.init();

		this.projectManager.openDb();
	}
}
