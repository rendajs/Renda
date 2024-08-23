import { assertEquals } from "std/testing/asserts.ts";
import { BinaryComposer, BinaryDecomposer } from "../../../../../src/mod.js";

Deno.test({
	name: "setting and getting all the value types",
	fn() {
		for (const littleEndian of [true, false]) {
			const composer = new BinaryComposer({ littleEndian });

			const buffer = new ArrayBuffer(3);

			const emptyBuffer = composer.getFullBuffer();
			assertEquals(emptyBuffer.byteLength, 0);

			const bufferView = new Uint8Array(buffer);
			bufferView[0] = 1;
			bufferView[1] = 2;
			bufferView[2] = 3;

			composer.appendBuffer(buffer);
			composer.appendInt8(-4);
			composer.appendUint8(5);
			composer.appendInt16(-6);
			composer.appendUint16(7);
			composer.appendInt32(-8);
			composer.appendUint32(9);
			composer.appendBigInt64(-10n);
			composer.appendBigUint64(11n);

			const uuidString = "01234567-89ab-cdef-0123-456789abcdef";
			composer.appendUuid(uuidString);

			const result = composer.getFullBuffer();

			const decomposer = new BinaryDecomposer(result, { littleEndian });

			const buffer2 = decomposer.getBuffer(3);
			const bufferView2 = new Uint8Array(buffer2);
			assertEquals(bufferView2[0], bufferView[0]);
			assertEquals(bufferView2[1], bufferView[1]);
			assertEquals(bufferView2[2], bufferView[2]);

			assertEquals(decomposer.getInt8(), -4);
			assertEquals(decomposer.getUint8(), 5);
			assertEquals(decomposer.getInt16(), -6);
			assertEquals(decomposer.getUint16(), 7);
			assertEquals(decomposer.getInt32(), -8);
			assertEquals(decomposer.getUint32(), 9);
			assertEquals(decomposer.getBigInt64(), -10n);
			assertEquals(decomposer.getBigUint64(), 11n);

			assertEquals(decomposer.getUuid(), uuidString);
		}
	},
});
