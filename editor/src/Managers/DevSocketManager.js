export default class DevSocketManager{
	constructor(){
		this.listeners = new Map();
		this.roundTripCbs = new Set();

		this.ws = new WebSocket("ws://localhost:5071");
		this.ws.addEventListener("message", e => this.handleMessage(e));

		this.lastRoundtripId = 0;
	}

	handleMessage(e){
		const data = JSON.parse(e.data);
		if(!data.op) return;
		if(data.op == "roundTripResponse"){
			for(const roundTripItem of this.roundTripCbs){
				if(roundTripItem.id == data.data.roundTripId){
					roundTripItem.cb(data.data.responseData);
					this.roundTripCbs.delete(roundTripItem);
				}
			}
		}else{
			const cbs = this.listeners.get(data.op);
			for(const cb of cbs){
				cb(data.data);
			}
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

	async sendRoundTripMessage(op, data){
		const roundTripId = this.lastRoundtripId++;
		this.ws.send(JSON.stringify({
			op: "roundTripRequest",
			roundTripOp: op,
			roundTripId, data,
		}));
		return await new Promise(r => {
			this.roundTripCbs.add({
				id: roundTripId,
				cb: r,
			})
		});
	}
}
