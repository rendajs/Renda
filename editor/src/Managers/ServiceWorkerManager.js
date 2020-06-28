import editor from "../editorInstance.js";

export default class ServiceWorkerManager{
	constructor(){
		this.registration = null;

		this.installationFailed = false;
		this.installSw();

		if(ServiceWorkerManager.supported){
			navigator.serviceWorker.addEventListener("message", async e => {
				if(e.data.type == "getProjectFile"){
					const {filePath} = e.data;
					const splitPath = filePath.split("/");
					const file = await editor.projectManager.currentProjectFileSystem.readFile(splitPath);
					if(e.ports.length > 0){
						for(const port of e.ports){
							port.postMessage(file);
						}
					}
				}
			});
		}
	}

	static get supported(){
		return 'serviceWorker' in window.navigator && !this.installationFailed;
	}

	async installSw(){
		if(!ServiceWorkerManager.supported) return;
		try{
			this.registration = await navigator.serviceWorker.register("sw.js");
		}catch(e){
			console.error("failed to install serviceWorker", e);
			this.installationFailed = true;
		}
		if(this.registration){
			this.registration.onupdatefound = _ => {
				if(this.registration.active != null){
					let installingWorker = this.registration.installing;
					installingWorker.onstatechange = _ => {
						if(installingWorker.state == "installed"){
							//TODO: show update notification
						}
					}
				}
			};
		}
	}

	async asyncMessage(message){
		await navigator.serviceWorker.ready;
		const channel = new MessageChannel();
		this.registration.active.postMessage(message, [channel.port2]);
		return await new Promise(resolve => {
			channel.port1.addEventListener("message", e => {
				channel.port1.close();
				resolve(e.data);
			});
			channel.port1.start();
		});
	}

	async getClientId(){
		return await this.asyncMessage({
			type: "requestClientId",
		});
	}
}
