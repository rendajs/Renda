export default class SingleInstancePromise{
	constructor(promiseFn, {
		//if this is true, the promise will run only once.
		//repeating calls to run() will always return the first result.
		once = true,
		run = false,
	} = {}){
		this.once = once;
		this.promiseFn = promiseFn;
		this.isRunning = false;
		this.hasRan = false;
		this.onceReturnValue = undefined;
		this.onRunFinishCbs = new Set();

		if(run) this.run();
	}

	//if `repeatIfRunning` is true and the promise is already running,
	//it will run again when the first run is done.
	//calling run() many times will not cause the promise to
	//run many times, i.e., jobs do not get queued indefinitely, only twice.
	async run(repeatIfRunning = false){
		if(this.isRunning){
			if(repeatIfRunning && !this.once){
				await new Promise(r => this.onRunFinishCbs.add(r));
				return await this.run(false);
			}else{
				return await new Promise(r => this.onRunFinishCbs.add(r));
			}
		}

		if(this.hasRan && this.once){
			return this.onceReturnValue;
		}

		this.isRunning = true;
		let result = await this.promiseFn();
		this.isRunning = false;
		this.hasRan = true;

		if(this.once){
			this.onceReturnValue = result;
		}

		const onRunFinishCbsCopy = this.onRunFinishCbs;
		this.onRunFinishCbs = new Set();
		for(const cb of onRunFinishCbsCopy){
			cb(result);
		}
		return result;
	}

	async waitForFinish(){
		if(this.hasRan) return;
		await new Promise(r => this.onRunFinishCbs.add(r));
	}
}
