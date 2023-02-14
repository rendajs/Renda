import {WebSocketManager} from "./WebSocketManager.js";

export class Application {
	constructor() {
		this.webSocketManager = new WebSocketManager();
	}
}
