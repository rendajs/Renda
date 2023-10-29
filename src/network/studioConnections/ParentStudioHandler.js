import {TypedMessenger} from "../../util/TypedMessenger.js";
import {TimeoutError} from "../../util/TimeoutError.js";

/**
 * This establishes a connection with the parent window in case the page is embedded in an iframe.
 * If the page is embedded by a studio instance in a build view,
 * we can communicate with the studio instance.
 */
export class ParentStudioHandler {
	constructor() {
		/**
		 * @private @type {TypedMessenger<{}, import("../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers>}
		 */
		this.parentMessenger = new TypedMessenger({globalTimeout: 1000});
		this.parentMessenger.setSendHandler(data => {
			if (!this.isInIframe()) {
				throw new Error("Failed to send message to parent, the page is not embedded in an iframe");
			}
			window.parent.postMessage(data.sendData, "*", data.transfer);
		});

		window.addEventListener("message", e => {
			if (!e.data) return;
			if (e.source == window.parent) {
				this.parentMessenger.handleReceivedMessage(e.data);
			}
		});
	}

	/**
	 * @private
	 */
	isInIframe() {
		return window.parent != window;
	}

	/**
	 * Checks if the page is embedded in an iframe and if the parent is a studio instance.
	 * If so, it will ask the parent what its preferred method of connection is.
	 * If the parent responds in time, a connection will be established via the provided DiscoveryManager
	 * @param {import("./DiscoveryManager.js").DiscoveryManager} discoveryManager
	 * @param {(typeof import("./discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryMethod | typeof import("./discoveryMethods/WebRtcDiscoveryMethod.js").WebRtcDiscoveryMethod)[]} supportedDiscoveryMethods
	 */
	async requestDesiredParentStudioConnection(discoveryManager, supportedDiscoveryMethods) {
		const sentence1 = "Failed to get parent client data.";
		const sentence2 = "requestParentStudioConnection() only works when called on a page that was created by Renda Studio. If this is not the case, use requestConnection() to connect to the specific client you wish to connect to.";
		if (!this.isInIframe()) {
			throw new Error(`${sentence1} ${sentence2}`);
		}
		let desiredConnectionData;
		try {
			desiredConnectionData = await this.parentMessenger.send.requestDesiredStudioConnectionMethod();
		} catch (e) {
			if (e instanceof TimeoutError) {
				throw new Error(`${sentence1} The parent didn't respond with client data in timely manner. ${sentence2}`);
			} else {
				throw e;
			}
		}

		for (const DiscoveryMethod of supportedDiscoveryMethods) {
			if (DiscoveryMethod.type == "renda:internal" && desiredConnectionData.type == "renda:internal") {
				discoveryManager.addDiscoveryMethod(DiscoveryMethod, desiredConnectionData.discoveryUrl);
				/** @type {import("./discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryRequestConnectionData} */
				const connectionData = {
					token: desiredConnectionData.internalConnectionToken,
				};
				discoveryManager.requestConnection(desiredConnectionData.clientUuid, connectionData);
			}
		}
	}
}
