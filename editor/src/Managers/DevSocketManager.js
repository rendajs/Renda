export default class DevSocketManager{
	constructor(){
		this.listeners = new Map();

		this.ws = new WebSocket("ws://localhost:5071");
		this.ws.addEventListener("message", e => this.handleMessage(e));
	}

	handleMessage(e){
		const data = JSON.parse(e.data);
		if(!data.type) return;
		const cbs = this.listeners.get(data.type);
		for(const cb of cbs){
			cb(data);
		}
	}

	addListener(type, cb){
		let cbsList = this.listeners.get(type);
		if(!cbsList){
			cbsList = new Set();
			this.listeners.set(type, cbsList);
		}
		cbsList.add(cb);
	}
}
