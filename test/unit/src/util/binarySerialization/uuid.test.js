import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { binaryToUuid, uuidToBinary } from "../../../../../src/mod.js";

Deno.test({
	name: "uuidToBinary()",
	fn() {
		const result = uuidToBinary("01234567-89ab-cdef-0123-456789abcdef");
		const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary(), all zeros",
	fn() {
		const result = uuidToBinary("00000000-0000-0000-0000-000000000000");
		const expected = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary() with null",
	fn() {
		const result = uuidToBinary(null);
		const expected = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary() with an invalid uuid should throw",
	fn() {
		assertThrows(() => {
			uuidToBinary("invalid");
		}, Error, `Failed to serialize uuid, string is not a valid uuid: "invalid"`);
	},
});

Deno.test({
	name: "binaryToUuid() with a buffer",
	fn() {
		const intView = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		const result = binaryToUuid(intView.buffer);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid() buffer that is longer than 16 bytes",
	fn() {
		/** @type {number[]} */
		const bytes = [];
		bytes.push(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef); // uuid
		bytes.push(0, 1, 2, 3); // extra
		const buffer = new Uint8Array(bytes).buffer;
		const result = binaryToUuid(buffer);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid(), buffer too short",
	fn() {
		const intView = new Uint8Array([0, 1, 2]);
		assertThrows(() => {
			binaryToUuid(intView.buffer);
		}, Error, "Failed to deserialize uuid, buffer is 3 bytes long, uuid buffers need to be at least 16 bytes long.");
	},
});

Deno.test({
	name: "binaryToUuid(), all zeros",
	fn() {
		const intView = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		const result = binaryToUuid(intView.buffer);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "binaryToUuid() with an offset argument",
	fn() {
		/** @type {number[]} */
		const bytes = [];
		bytes.push(0, 1, 2, 3); // extra
		bytes.push(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef); // uuid
		bytes.push(0, 1, 2, 3); // extra
		const buffer = new Uint8Array(bytes).buffer;
		const result = binaryToUuid(buffer, 4);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid() with an offset and a buffer that is too short",
	fn() {
		const buffer = new Uint8Array([1, 2, 3]).buffer;
		assertThrows(() => {
			binaryToUuid(buffer, 1);
		}, Error, "Failed to deserialize uuid, buffer is 2 bytes long, uuid buffers need to be at least 16 bytes long.");
	},
});
