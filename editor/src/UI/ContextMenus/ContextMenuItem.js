export default class ContextMenuItem{
	constructor(parentContextMenu, text, onClickCb, {
		disabled = false,
	} = {}){
		this.parentContextMenu = parentContextMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenuItem");
		this.el.classList.toggle("disabled", disabled);

		this.disabled = disabled;

		this.onClickCbs = [];
		if(onClickCb) this.onClick(onClickCb);

		this.el.addEventListener("click", _ => {
			if(this.disabled) return;
			for(const cb of this.onClickCbs){
				cb();
			}
			this.parentContextMenu.onItemClicked();
		});

		this.setText(text);
	}

	destructor(){
		this.onClickCbs = [];
	}

	setText(text){
		this.el.textContent = text;
	}

	onClick(cb){
		this.onClickCbs.push(cb);
	}
}
