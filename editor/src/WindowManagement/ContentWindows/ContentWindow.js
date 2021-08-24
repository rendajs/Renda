export default class ContentWindow{

	/**
	 * Should be overridden by inherited class.
	 * This name will be used for saving the users workspace.
	 * @type {String}
	 */
	static contentWindowTypeId = null;

	/**
	 * Should be overridden by inherited class.
	 * This name will be visible in the UI.
	 * @type {String}
	 */
	static contentWindowUiName = null;

	constructor(parentEditorWindow){
		this.parentEditorWindow = parentEditorWindow;

		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");

		this.topButtonBar = document.createElement("div");
		this.topButtonBar.classList.add("editorContentWindowTopButtonBar");
		this.el.appendChild(this.topButtonBar);

		this.tabSelectorSpacer = document.createElement("div");
		this.tabSelectorSpacer.classList.add("editorContentWindowTopButtonBarSpacer");
		this.topButtonBar.appendChild(this.tabSelectorSpacer);

		this.contentEl = document.createElement("div");
		this.contentEl.classList.add("editorContentWindowContent");
		this.el.appendChild(this.contentEl);

		this.addedButtons = [];

		if(typeof this.loop == "function"){
			window.requestAnimationFrame(this._loop.bind(this));
		}
	}

	destructor(){
		this.el = null;
		this.topButtonBar = null;
		this.tabSelectorSpacer = null;
		this.contentEl = null;
		for(const b of this.addedButtons){
			b.destructor();
		}
		this.addedButtons = [];
	}

	setVisible(visible){
		this.el.classList.toggle("hidden", !visible);
	}

	updateTabSelectorSpacer(w, h){
		this.tabSelectorSpacer.style.width = w+"px";
		this.tabSelectorSpacer.style.height = h+"px";
	}

	setContentBehindTopBar(value){
		this.contentEl.classList.toggle("behindTopButtonBar", value);
	}

	get contentWidth(){
		return this.contentEl.clientWidth;
	}
	get contentHeight(){
		return this.contentEl.clientHeight;
	}

	onResized(){
		this.onWindowResize(this.contentWidth, this.contentHeight);
	}

	onWindowResize(w, h){}

	addTopBarButton(button){
		this.addedButtons.push(button);
		this.topButtonBar.appendChild(button.el);
	}

	_loop(){
		if(!this.el) return; //if destructed
		this.loop();
		window.requestAnimationFrame(this._loop.bind(this));
	}
}
