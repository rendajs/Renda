/**
 * Checks if two arrays of strings contain the exact same strings.
 * @param {string[]} str1
 * @param {string[]} str2
 */
export function stringArrayEquals(str1, str2) {
	if (str1.length != str2.length) return false;
	for (let i = 0; i < str1.length; i++) {
		if (str1[i] != str2[i]) return false;
	}
	return true;
}
