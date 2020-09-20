export default class PromiseWaitHelper{
	constructor({
		once = true,
	} = {}){
		this.once = once;
		this.done = false;
		this.onFireCbs = new Set();
	}

	fire(){
		if(this.done && this.once) return;

		for(const cb of this.onFireCbs){
			cb();
		}
		this.onFireCbs.clear();
		this.done = true;
	}

	async wait(){
		if(this.done && this.once) return;
		await new Promise(r => this.onFireCbs.add(r));
	}
}
