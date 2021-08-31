import EditorWindowSplit from "./EditorWindowSplit.js";
import EditorWindowTabs from "./EditorWindowTabs.js";
import ContentWindows from "./ContentWindows/ContentWindows.js";
import ContentWindow from "./ContentWindows/ContentWindow.js";
import WorkspaceManager from "./WorkspaceManager.js";

export default class WindowManager{
	constructor(){
		this.rootWindow = null;
		this.lastFocusedEditorWindow = null;

		this.isLoadingWorkspace = false;
		this.workspaceManager = new WorkspaceManager();
		this.workspaceManager.onCurrentWorkspaceIdChange(() => {
			this.reloadCurrentWorkspace();
		});

		/** @type {Map<string, typeof ContentWindow>} */
		this.registeredContentWindows = new Map();

		for(const w of ContentWindows){
			this.registerContentWindow(w);
		}

		window.addEventListener("resize", () => {
			if(this.rootWindow){
				this.rootWindow.onResized();
			}
		});
	}

	init(){
		this.reloadCurrentWorkspace();
	}

	async reloadCurrentWorkspace(){
		const workspaceData = await this.workspaceManager.getCurrentWorkspace();
		this.loadWorkspace(workspaceData);
	}

	async saveWorkspace() {
		const workspaceData = this.getCurrentWorkspaceData();
		await this.workspaceManager.saveCurrentWorkspace(workspaceData);
	}

	getCurrentWorkspaceData() {
		const rootWindow = this.serializeWorkspaceWindow(this.rootWindow);
		return {rootWindow};
	}

	loadWorkspace(workspace){
		this.isLoadingWorkspace = true;

		if(this.rootWindow){
			this.rootWindow.destructor();
		}
		this.lastFocusedEditorWindow = null;
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.rootWindow.setRoot();
		this.parseWorkspaceWindowChildren(workspace.rootWindow, this.rootWindow);
		this.rootWindow.onWorkspaceChange(() => {
			if (!this.isLoadingWorkspace) {
				this.saveWorkspace();
			}
		});

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();

		this.isLoadingWorkspace = false;
	}

	parseWorkspaceWindow(workspaceWindow){
		let newWindow = null;
		if(workspaceWindow.type == "split"){
			newWindow = new EditorWindowSplit();
			newWindow.splitHorizontal = workspaceWindow.splitHorizontal;
			newWindow.splitPercentage = workspaceWindow.splitPercentage;
		}else if(workspaceWindow.type == "tabs"){
			newWindow = new EditorWindowTabs();
			for(let i=0; i<workspaceWindow.tabTypes.length; i++){
				newWindow.setTabType(i, workspaceWindow.tabTypes[i]);
			}
			newWindow.setActiveTabIndex(workspaceWindow.activeTabIndex || 0);
			newWindow.onFocusedChange(hasFocus => {
				if(hasFocus) this.lastFocusedEditorWindow = newWindow;
			});
		}
		return newWindow;
	}

	parseWorkspaceWindowChildren(workspaceWindow, existingWorkspaceWindow){
		if(workspaceWindow.type == "split"){
			const windowA = this.parseWorkspaceWindow(workspaceWindow.windowA);
			const windowB = this.parseWorkspaceWindow(workspaceWindow.windowB);
			existingWorkspaceWindow.setWindows(windowA, windowB);
			this.parseWorkspaceWindowChildren(workspaceWindow.windowA, existingWorkspaceWindow.windowA);
			this.parseWorkspaceWindowChildren(workspaceWindow.windowB, existingWorkspaceWindow.windowB);
		}
	}

	/**
	 * @param {import("./EditorWindow.js").default} workspaceWindow
	 * @returns {import("./WorkspaceManager.js").WorkspaceDataWindow}
	 */
	serializeWorkspaceWindow(workspaceWindow) {
		if (workspaceWindow instanceof EditorWindowSplit) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */
			const data = {
				type: "split",
				splitHorizontal: workspaceWindow.splitHorizontal,
				splitPercentage: workspaceWindow.splitPercentage,
				windowA: this.serializeWorkspaceWindow(workspaceWindow.windowA),
				windowB: this.serializeWorkspaceWindow(workspaceWindow.windowB),
			};
			return data;
		} else if (workspaceWindow instanceof EditorWindowTabs) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */
			const data = {
				type: "tabs",
				tabTypes: workspaceWindow.tabTypes,
				activeTabIndex: workspaceWindow.activeTabIndex
			};
			return data;
		}
	}

	/**
	 * @param {typeof ContentWindow} constructor
	 */
	registerContentWindow(constructor){
		if(!(constructor.prototype instanceof ContentWindow)){
			console.warn("Tried to register content window ("+constructor.name+") that does not extend ContentWindow class.");
			return;
		}
		if(constructor.contentWindowTypeId == null){
			console.warn("Tried to register content window ("+constructor.name+") with no window name, override the static contentWindowTypeId property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.set(constructor.contentWindowTypeId, constructor);

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

	*getContentWindowsByConstructor(contentWindowConstructor){
		for(const w of this.allContentWindows()){
			if(w instanceof contentWindowConstructor){
				yield w;
			}
		}
	}

	focusOrCreateContentWindowType(type){
		const contentWindowConstructor = this.getContentWindowConstructorByType(type);
		let foundContentWindow = null;
		for(const contentWindow of this.getContentWindowsByConstructor(contentWindowConstructor)){
			foundContentWindow = contentWindow;
			break;
		}
		if(!foundContentWindow){
			foundContentWindow = this.createNewContentWindow(type);
		}
		if(!foundContentWindow) return null;

		foundContentWindow.parentEditorWindow.focus();
		foundContentWindow.parentEditorWindow.setActiveContentWindow(foundContentWindow);
		return foundContentWindow;
	}

	createNewContentWindow(type){
		for(const w of this.allEditorWindows()){
			if(w instanceof EditorWindowTabs){
				return w.addTabType(type);
			}
		}
	}

	get lastFocusedContentWindow(){
		return this.lastFocusedEditorWindow?.activeTab || null;
	}
}
