export default class DragManager{
	constructor(){

	}

	createDragFeedbackText({
		text = "",
	} = {}){
		let el = document.createElement("div");
		el.classList.add("dragFeedbackText");
		el.textContent = text;
		document.body.appendChild(el);
		let x = el.offsetWidth / 2;
		let y = el.offsetHeight / 2;
		return {el, x, y};
	}

	removeFeedbackEl(el){
		if(el.parentElement) el.parentElement.removeChild(el);
	}
}
