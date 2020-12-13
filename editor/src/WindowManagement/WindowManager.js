import EditorWindowSplit from "./EditorWindowSplit.js";
import EditorWindowTabs from "./EditorWindowTabs.js";
import ContentWindows from "./ContentWindows/ContentWindows.js";
import ContentWindow from "./ContentWindows/ContentWindow.js";

export default class WindowManager{
	constructor(){
		this.rootWindow = null;
		this.focusedEditorWindow = null;
		this.lastFocusedEditorWindow = null;

		this.registeredContentWindows = new Map();

		for(const w of ContentWindows){
			this.registerContentWindow(w);
		}

		window.addEventListener("blur", _ => {
			this.setFocusedEditorWindow(null);
		})
	}

	init(){
		this.reloadCurrentWorkspace();
	}

	reloadCurrentWorkspace(){
		this.loadWorkspace({
			rootWindow: {
				type: "split",
				splitHorizontal: false,
				splitPercentage: 0.25,
				windowA: {
					type: "split",
					splitHorizontal: true,
					splitPercentage: 0.6,
					windowA: {
						type: "tabs",
						tabTypes: ["outliner"],
					},
					windowB: {
						type: "tabs",
						tabTypes: ["project"],
					},
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
							tabTypes: ["entityEditor"],
						},
						windowB: {
							type: "tabs",
							tabTypes: ["buildView"],
						},
					},
					windowB: {
						type: "tabs",
						tabTypes: ["properties"],
					},
				}
			}
		});
	}

	loadWorkspace(workspace){
		if(this.rootWindow){
			this.rootWindow.destructor();
		}
		this.focusedEditorWindow = null;
		this.lastFocusedEditorWindow = null;
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.rootWindow.setRoot();
		this.parseWorkspaceWindowChildren(workspace.rootWindow, this.rootWindow);

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
	}

	parseWorkspaceWindow(workspaceWindow){
		let newWindow = null;
		if(workspaceWindow.type == "split"){
			newWindow = new EditorWindowSplit(this);
			newWindow.splitHorizontal = workspaceWindow.splitHorizontal;
			newWindow.splitPercentage = workspaceWindow.splitPercentage;
		}else if(workspaceWindow.type == "tabs"){
			newWindow = new EditorWindowTabs(this);
			for(let i=0; i<workspaceWindow.tabTypes.length; i++){
				newWindow.setTabType(i, workspaceWindow.tabTypes[i]);
			}
			newWindow.setActiveTab(workspaceWindow.activeTab || 0);
			newWindow.onEditorWindowClick(_ => {
				this.setFocusedEditorWindow(newWindow);
			});
		}
		return newWindow;
	}

	parseWorkspaceWindowChildren(workspaceWindow, existingWorkspaceWindow){
		if(workspaceWindow.type == "split"){
			existingWorkspaceWindow.windowA = this.parseWorkspaceWindow(workspaceWindow.windowA);
			existingWorkspaceWindow.windowB = this.parseWorkspaceWindow(workspaceWindow.windowB);
			this.parseWorkspaceWindowChildren(workspaceWindow.windowA, existingWorkspaceWindow.windowA);
			this.parseWorkspaceWindowChildren(workspaceWindow.windowB, existingWorkspaceWindow.windowB);
		}
	}

	registerContentWindow(constructor){
		if(!(constructor.prototype instanceof ContentWindow)){
			console.warn("Tried to register content window ("+constructor.name+") that does not extend ContentWindow class.");
			return;
		}
		if(constructor.windowName == null){
			console.warn("Tried to register content window ("+constructor.name+") with no window name, override the static windowName property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.set(constructor.windowName, constructor);

		for(const w of this.allEditorWindows()){
			w.onContentWindowRegistered(constructor);
		}
	}

	getContentWindowConstructorByType(type){
		return this.registeredContentWindows.get(type);
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

	setFocusedEditorWindow(editorWindow){
		if(this.focusedEditorWindow){
			this.focusedEditorWindow.setFocused(false);
		}
		this.focusedEditorWindow = editorWindow;
		if(editorWindow) this.lastFocusedEditorWindow = editorWindow;
		if(this.focusedEditorWindow){
			this.focusedEditorWindow.setFocused(true);
		}
	}

	get focusedContentWindow(){
		return this.focusedEditorWindow?.activeTab || null;
	}

	get lastFocusedContentWindow(){
		return this.lastFocusedEditorWindow?.activeTab || null;
	}
}
