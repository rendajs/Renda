export default class MessageHandler {
	/**
	 * @abstract
	 * @param {*} data
	 */
	send(data) {}

	/**
	 * @param {*} data
	 */
	onMessage(data) {
		console.log(data);
	}
}
