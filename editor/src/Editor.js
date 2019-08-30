import * as WindowManagement from "./WindowManagement/WindowManagement.js";
import * as GameEngine from "../../src/index.js";

export default class Editor{
	constructor(){
		this.renderer = new GameEngine.RealTimeRenderer();
		this.windowManger = new WindowManagement.WindowManager();
	}

	init(){

	}
}
