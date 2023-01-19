/**
 * @typedef ShortcutCommandAstVariableNode
 * @property {"variable"} type
 * @property {string} name
 * @property {boolean} isBoolean
 * @property {string} value
 */

/**
 * @typedef ShortcutCommandAstNegateNode
 * @property {"negate"} type
 * @property {ShortcutCommandAstNode} child
 */

/**
 * @typedef ShortcutCommandAstOperatorNode
 * @property {"operator"} type
 * @property {boolean} isAndOperation
 * @property {ShortcutCommandAstNode} leftCondition
 * @property {ShortcutCommandAstNode} rightCondition
 */

/** @typedef {ShortcutCommandAstOperatorNode | ShortcutCommandAstNegateNode | ShortcutCommandAstVariableNode} ShortcutCommandAstNode */

/**
 * Parses an expression into an AST.
 * @param {string} expression
 */
export function parseExpression(expression) {
	let pos = 0;

	const symbols = ["||", "&&", "(", ")", "==", "!=", "!"];

	/**
	 * @param {string} str
	 */
	function startsWithSymbol(str) {
		for (const sym of symbols) {
			if (str.startsWith(sym)) {
				return sym;
			}
		}
		return null;
	}

	function skipWhitespace() {
		while (pos < expression.length && /\s/.test(expression[pos])) {
			pos++;
		}
	}

	function getNextToken() {
		skipWhitespace();
		if (pos >= expression.length) return null;
		const currentText = expression.slice(pos);
		const startsWithSym = startsWithSymbol(currentText);
		if (startsWithSym) {
			pos += startsWithSym.length;
			return startsWithSym;
		}

		const quotes = ["'", '"'];
		const startQuote = quotes.includes(expression[pos]) ? expression[pos] : null;
		const tokenStartPos = pos;
		if (startQuote) pos++;
		while (pos < expression.length) {
			pos++;
			if (startQuote) {
				if (expression[pos - 1] == startQuote) break;
			} else {
				if (startsWithSymbol(expression.slice(pos)) || /\s/.test(expression[pos])) break;
			}
		}
		return expression.slice(tokenStartPos, pos);
	}

	const tokens = [];
	while (true) {
		const token = getNextToken();
		if (!token) break;
		tokens.push(token);
	}

	/**
	 * @template {ShortcutCommandAstNode} T
	 * @param {T} node
	 */
	function createNode(node) {
		return node;
	}

	/**
	 * @param {(string | ShortcutCommandAstNode)[]} tokens
	 * @returns {ShortcutCommandAstNode}
	 */
	function parseTokens(tokens) {
		const bracketIndex = tokens.indexOf("(");
		const lastBracketIndex = tokens.lastIndexOf(")");
		if (bracketIndex >= 0 && lastBracketIndex == -1 || lastBracketIndex >= 0 && bracketIndex == -1) {
			throw new MalformedSyntaxError("Failed to parse condition, brackets mismatch");
		}
		if (bracketIndex >= 0 && lastBracketIndex >= 0) {
			const bracketsTokens = tokens.slice(bracketIndex + 1, lastBracketIndex);
			const bracketsNode = parseTokens(bracketsTokens);
			const leftTokens = tokens.slice(0, bracketIndex);
			const rightTokens = tokens.slice(lastBracketIndex + 1);
			tokens = [...leftTokens, bracketsNode, ...rightTokens];
		}
		for (const operator of ["||", "&&"]) {
			const operatorIndex = tokens.indexOf(operator);
			if (operatorIndex >= 0) {
				const leftTokens = tokens.slice(0, operatorIndex);
				const rightTokens = tokens.slice(operatorIndex + 1);
				return createNode({
					type: "operator",
					isAndOperation: operator == "&&",
					leftCondition: parseTokens(leftTokens),
					rightCondition: parseTokens(rightTokens),
				});
			}
		}
		if (tokens[0] == "!") {
			return createNode({
				type: "negate",
				child: parseTokens(tokens.slice(1)),
			});
		} if (tokens.length == 3 && (tokens[1] == "==" || tokens[1] == "!=")) {
			const name = tokens[0];
			const value = tokens[2];
			if (typeof name != "string" || typeof value != "string") {
				throw new MalformedSyntaxError();
			}
			if (value.length < 2 || value[0] != value[value.length - 1] || !['"', "'"].includes(value[0])) {
				throw new MalformedSyntaxError();
			}
			const node = createNode({
				type: "variable",
				isBoolean: false,
				name,
				value: value.slice(1, value.length - 1),
			});
			if (tokens[1] == "==") {
				return node;
			} else {
				return createNode({
					type: "negate",
					child: node,
				});
			}
		} else if (tokens.length == 1) {
			const name = tokens[0];
			if (typeof name != "string") {
				return name;
			}
			return createNode({
				type: "variable",
				isBoolean: true,
				name,
				value: "",
			});
		}
		throw new MalformedSyntaxError();
	}

	return parseTokens(tokens);
}

/**
 * Executes an expression and checks if the conditions are true.
 * @param {ShortcutCommandAstNode} ast
 * @param {(name: string) => string[] | boolean | null | undefined} variableResolver
 * @returns {boolean}
 */
export function verifyExpression(ast, variableResolver) {
	if (ast.type == "variable") {
		const value = variableResolver(ast.name);
		if (ast.isBoolean && typeof value == "boolean") {
			return value;
		} else if (Array.isArray(value)) {
			return value.includes(ast.value);
		}
		return false;
	} else if (ast.type == "negate") {
		return !verifyExpression(ast.child, variableResolver);
	} else if (ast.type == "operator") {
		const left = verifyExpression(ast.leftCondition, variableResolver);
		const right = verifyExpression(ast.rightCondition, variableResolver);
		if (ast.isAndOperation) {
			return left && right;
		} else {
			return left || right;
		}
	} else {
		const castNode = /** @type {ShortcutCommandAstNode} */ (ast);
		throw new Error("Unexpected node type: " + castNode.type);
	}
}

export class MalformedSyntaxError extends Error {
	/**
	 * @param {string} [message]
	 */
	constructor(message = "Malformed syntax") {
		super(message);
		this.name = this.constructor.name;
	}
}
