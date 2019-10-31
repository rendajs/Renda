import EditorWindow from "./EditorWindow.js";
import {clamp01, mapValue} from "../Util/Util.js";

export default class EditorWindowSplit extends EditorWindow{
	constructor(){
		super();

		this.el.classList.add("editorWindowSplit");

		this.splitHorizontal = false;
		this.splitPercentage = 0.5;
		this.windowA = null;
		this.windowB = null;

		this.isResizing = false;
		this.boundOnResizerDown = this.onResizerDown.bind(this);
		this.boundOnResizerMove = this.onResizerMove.bind(this);
		this.boundOnResizerUp = this.onResizerUp.bind(this);

		this.resizeStartBounds = null;

		this.elA = document.createElement("div");
		this.elA.classList.add("editorWindowSplitHalf")
		this.el.appendChild(this.elA);

		this.resizer = document.createElement("div");
		this.resizer.classList.add("editorWindowSplitResizer");
		this.el.appendChild(this.resizer);

		this.resizer.addEventListener("mousedown", this.boundOnResizerDown);

		this.elB = document.createElement("div");
		this.elB.classList.add("editorWindowSplitHalf")
		this.el.appendChild(this.elB);
	}

	updateEls(){
		while(this.elA.firstChild){
			this.elA.removeChild(this.elA.firstChild);
		}
		while(this.elB.firstChild){
			this.elB.removeChild(this.elB.firstChild);
		}

		if(this.windowA.el) this.elA.appendChild(this.windowA.el);
		if(this.windowB.el) this.elB.appendChild(this.windowB.el);

		this.updateSplit();

		this.windowA.updateEls();
		this.windowB.updateEls();
	}

	updateSplit(){
		this.el.style.flexDirection = this.splitHorizontal ? "column" : "row";

		this.resizer.style.width = this.splitHorizontal ? null : "3px";
		this.resizer.style.height = this.splitHorizontal ? "3px" : null;
		this.resizer.style.cursor = this.splitHorizontal ? "row-resize" : "col-resize";
		this.resizer.style.transform = this.splitHorizontal ? "scale(1, 2.5)" : "scale(2.5, 1)";

		this.elA.style.flexGrow = this.splitPercentage;
		this.elB.style.flexGrow = 1 - this.splitPercentage;
		this.elA.style.flexBasis = this.elB.flexBasis = 0;

		this.onResized();
	}

	onResizerDown(e){
		this.isResizing = true;
		this.resizeStartBounds = this.el.getBoundingClientRect();
		window.addEventListener("mouseup", this.boundOnResizerUp);
		window.addEventListener("mousemove", this.boundOnResizerMove);
	}

	onResizerMove(e){
		this.calcNewPercentage(
			this.splitHorizontal ? this.resizeStartBounds.top  : this.resizeStartBounds.left,
			this.splitHorizontal ? this.resizeStartBounds.bottom : this.resizeStartBounds.right,
			this.splitHorizontal ? e.clientY : e.clientX
		);
	}

	calcNewPercentage(boundStart, boundEnd, newValue){
		let newPercentage = mapValue(boundStart, boundEnd, 0, 1, newValue);
		this.setNewSplitPercentage(newPercentage);
	}

	setNewSplitPercentage(newPercentage){
		this.splitPercentage = clamp01(newPercentage);
		this.updateSplit();
	}

	onResizerUp(e){
		this.isResizing = false;
		window.removeEventListener("mouseup", this.boundOnResizerUp);
		window.removeEventListener("mousemove", this.boundOnResizerMove);
	}

	*getChildren(){
		if(this.windowA){
			yield this.windowA;
			for(const child of this.windowA.getChildren()){
				yield child;
			}
		}
		if(this.windowB){
			yield this.windowB;
			for(const child of this.windowB.getChildren()){
				yield child;
			}
		}
	}

	onResized(){
		super.onResized();
		if(this.windowA) this.windowA.onResized();
		if(this.windowB) this.windowB.onResized();
	}
}
