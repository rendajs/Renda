import { MessageHandler } from "./MessageHandler.js";

export class InternalMessageHandler extends MessageHandler {
	/**
	 * @param {import("./MessageHandler.js").MessageHandlerOptions} options
	 * @param {MessagePort} messagePort
	 * @param {(accepted: boolean) => void} onPermissionResult
	 */
	constructor(options, messagePort, onPermissionResult) {
		super(options);

		this.supportsSerialization = true;

		/** @private */
		this.messagePort = messagePort;
		/** @private */
		this.onPermissionResult = onPermissionResult;
		messagePort.addEventListener("message", (e) => {
			this.handleMessageReceived(e.data);
		});
		messagePort.start();
		if (options.initiatedByMe) {
			this.setStatus("outgoing-permission-pending");
		} else {
			this.setStatus("incoming-permission-pending");
		}
	}

	/**
	 * @override
	 */
	requestAccepted() {
		this.onPermissionResult(true);
	}

	/**
	 * @abstract
	 */
	requestRejected() {
		this.onPermissionResult(false);
	}

	/**
	 * @param {boolean} accepted
	 */
	permissionResult(accepted) {
		if (accepted) {
			this.setStatus("connected");
		} else {
			this.setStatus("outgoing-permission-rejected");
		}
	}

	/**
	 * @override
	 * @param {unknown} data
	 * @param {object} [sendOptions]
	 * @param {Transferable[]} [sendOptions.transfer]
	 */
	send(data, { transfer } = {}) {
		if (!this.messagePort) return;
		this.messagePort.postMessage(data, transfer || []);
	}

	close() {
		this.messagePort.close();
	}
}
