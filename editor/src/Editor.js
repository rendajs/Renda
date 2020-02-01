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

	init(){
		this.renderer.init();
		this.windowManager.init(this);
		this.propertiesWindowContentManager.init();
	}
}
