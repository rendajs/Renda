export default class SingleInstancePromise{
	constructor(promiseFn, {
		once = true,
	} = {}){
		this.once = once;
		this.promiseFn = promiseFn;
		this.isRunning = false;
		this.hasRan = false;
		this.onceReturnValue = undefined;
		this.onRunFinishCbs = [];
	}

	async run(){
		if(this.isRunning){
			return await new Promise(r => this.onRunFinishCbs.push(r));
		}

		if(this.hasRan && this.once){
			return this.onceReturnValue;
		}

		this.isRunning = true;
		let result = await this.promiseFn();
		this.isRunning = false;

		if(this.once){
			this.hasRan = true;
			this.onceReturnValue = result;
		}

		for(const cb of this.onRunFinishCbs){
			cb(result);
		}
		this.onRunFinishCbs = [];
		return result;
	}
}
