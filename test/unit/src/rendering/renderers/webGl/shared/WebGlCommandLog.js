import { assertEquals, assertStrictEquals, equal } from "std/testing/asserts.ts";

export class WebGlCommandLog {
	/**
	 * @typedef CommandLogEntry
	 * @property {string} name
	 * @property {unknown[]} args
	 * @property {import("./WebGlRenderingContext.js").WebGlObject} createdObject
	 */

	/** @type {CommandLogEntry[]} */
	log = [];

	clear() {
		this.log = [];
	}

	/**
	 * @param {number} count
	 */
	assertCount(count) {
		assertEquals(this.log.length, count);
	}

	/**
	 * @param {Partial<CommandLogEntry>[]} log
	 */
	assertLogEquals(log) {
		assertLogEquals(this.log, log);
	}

	/**
	 * @param  {...string} commands
	 */
	getFilteredCommands(...commands) {
		return this.log.filter((c) => commands.includes(c.name));
	}

	/**
	 * @param  {...string} commands
	 */
	getFilteredArgs(...commands) {
		return this.log.filter((c) => commands.includes(c.name)).map((c) => c.args);
	}

	/**
	 * @param {object} options
	 * @param {(value: CommandLogEntry, index: number) => unknown} options.predicate A function to find a reference log entry.
	 * @param {boolean} [options.last] Set to true to start searching from the end.
	 */
	assertExists({ predicate, last = false }) {
		let entry;
		if (last) {
			entry = this.log.findLast(predicate);
		} else {
			entry = this.log.find(predicate);
		}
		if (!entry) {
			throw new Error("The log entry wasn't found.");
		}
	}

	/**
	 * Finds a range of log entries based on a set of parameters.
	 * @param {object} options
	 * @param {(value: CommandLogEntry, index: number) => unknown} options.predicate A function to find a reference log entry.
	 * @param {number} [options.startOffset] The start of the range relative to the reference entry of.
	 * @param {number} [options.endOffset] The end of the range relative to the reference entry of.
	 * @param {boolean} [options.last] Set to true to start searching from the end.
	 */
	findRange({
		predicate,
		startOffset = 0,
		endOffset = 0,
		last = false,
	}) {
		let index;
		if (last) {
			index = this.log.findLastIndex(predicate);
		} else {
			index = this.log.findIndex(predicate);
		}
		if (index < 0) {
			return {
				range: [],
				index,
			};
		}
		const start = index + startOffset;
		const end = index + endOffset + 1;
		if (start > end) {
			throw new Error("startOffset must be smaller than endOffset");
		}
		if (start < 0 || end < 0 || start > this.log.length || end > this.log.length) {
			throw new Error("Offsets resulted in an invalid range");
		}
		return {
			range: this.log.slice(start, end),
			index,
		};
	}

	/**
	 * Tries to find find the last 'bindBuffer' command and assert if the provided WebGL object
	 * matches the last buffer that was bound.
	 * @param {string} type
	 * @param {import("./WebGlRenderingContext.js").WebGlObject} buffer
	 * @param {number} [index] The index in the log to start searching from.
	 * By default this is the last entry in the log.
	 */
	assertLastBoundBuffer(type, buffer, index = this.log.length) {
		const { range } = this.findRange({
			predicate: (e, i) => {
				if (i > index) return false;
				return e.name == "bindBuffer" && e.args[0] == type;
			},
			last: true,
		});
		assertStrictEquals(range[0].args[1], buffer);
	}
}

/**
 * @param {CommandLogEntry[]} log
 * @param {Partial<CommandLogEntry>[]} expected
 */
function logEquals(log, expected) {
	if (log.length != expected.length) return false;
	for (let i = 0; i < expected.length; i++) {
		const entry = log[i];
		const expectedEntry = expected[i];
		if (!logEntryEquals(entry, expectedEntry)) return false;
	}
	return true;
}

/**
 * @param {CommandLogEntry} entry
 * @param {Partial<CommandLogEntry>} expected
 */
function logEntryEquals(entry, expected) {
	if ("name" in expected && !equal(entry.name, expected.name)) {
		return false;
	}
	if ("args" in expected && !equal(entry.args, expected.args)) {
		return false;
	}
	return true;
}

/**
 * @param {CommandLogEntry} entry
 * @param {Partial<CommandLogEntry>} expected
 */
export function assertLogEntryEquals(entry, expected) {
	if (!logEntryEquals(entry, expected)) {
		assertEquals(entry, expected);
	}
}

/**
 * @param {CommandLogEntry[]} log
 * @param {Partial<CommandLogEntry>[]} expected
 */
export function assertLogEquals(log, expected) {
	if (!logEquals(log, expected)) {
		assertEquals(log, expected);
	}
}
