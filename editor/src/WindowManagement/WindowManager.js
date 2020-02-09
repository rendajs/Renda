import EditorWindowSplit from "./EditorWindowSplit.js";
import EditorWindowTabs from "./EditorWindowTabs.js";
import ContentWindows from "./ContentWindows/ContentWindows.js";
import ContentWindow from "./ContentWindows/ContentWindow.js";

export default class WindowManager{
	constructor(){
		this.rootWindow = null;

		this.registeredContentWindows = [];

		for(const w of ContentWindows){
			this.registerContentWindow(w);
		}
	}

	init(){
		this.loadWorkspace({
			rootWindow: {
				type: "split",
				splitHorizontal: false,
				splitPercentage: 0.25,
				windowA: {
					type: "tabs",
					tabTypes: ["Outliner", "Project"],
					activeTab: 0,
				},
				windowB: {
					type: "split",
					splitHorizontal: false,
					splitPercentage: 0.6,
					windowA: {
						type: "split",
						splitHorizontal: true,
						splitPercentage: 0.5,
						windowA: {
							type: "tabs",
							tabTypes: ["ObjectEditor"],
						},
						windowB: {
							type: "tabs",
							tabTypes: ["RenderView"],
						},
					},
					windowB: {
						type: "tabs",
						tabTypes: ["Properties"],
					},
				}
			}
		});
	}

	loadWorkspace(workspace){
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.rootWindow.setRoot();

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
	}

	parseWorkspaceWindow(workspaceWindow){
		let newWindow = null;
		if(workspaceWindow.type == "split"){
			newWindow = new EditorWindowSplit(this);
			newWindow.splitHorizontal = workspaceWindow.splitHorizontal;
			newWindow.splitPercentage = workspaceWindow.splitPercentage;
			newWindow.windowA = this.parseWorkspaceWindow(workspaceWindow.windowA);
			newWindow.windowB = this.parseWorkspaceWindow(workspaceWindow.windowB);
		}else if(workspaceWindow.type == "tabs"){
			newWindow = new EditorWindowTabs(this);
			for(let i=0; i<workspaceWindow.tabTypes.length; i++){
				newWindow.setTabType(i, workspaceWindow.tabTypes[i]);
			}
			newWindow.setActiveTab(workspaceWindow.activeTab || 0);
		}
		return newWindow;
	}

	registerContentWindow(constructor){
		if(!(constructor.prototype instanceof ContentWindow)){
			console.warn("Tried to register content window ("+constructor.name+") that does not extend ContentWindow class.");
			return;
		}
		if(constructor.windowName == "Empty"){
			console.warn("Tried to register content window ("+constructor.name+") with no window name, override the static windowName property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.push(constructor);

		for(const w of this.allEditorWindows()){
			w.onContentWindowRegistered(constructor);
		}
	}

	getContentWindowConstructorByType(type){
		for(const contentWindow of this.registeredContentWindows){
			if(contentWindow.windowName == type){
				return contentWindow;
			}
		}
		return null;
	}

	*allEditorWindows(){
		if(!this.rootWindow) return;
		yield this.rootWindow;
		for(const child of this.rootWindow.getChildren()){
			yield child;
		}
	}

	*allContentWindows(){
		for(const w of this.allEditorWindows()){
			if(w instanceof EditorWindowTabs){
				for(const tab of w.tabs){
					yield tab;
				}
			}
		}
	}

	*getContentWindowsByType(type){
		for(const w of this.allContentWindows()){
			if(w instanceof type){
				yield w;
			}
		}
	}
}
