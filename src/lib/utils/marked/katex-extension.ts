import katex from 'katex';

const DELIMITER_LIST = [
	{ left: '$', right: '$', display: false },
	{ left: '$$', right: '$$', display: true },
	{ left: '\\pu{', right: '}', display: false },
	{ left: '\\ce{', right: '}', display: false },
	{ left: '\\(', right: '\\)', display: false },
	{ left: '( ', right: ' )', display: false },
	{ left: '\\[', right: '\\]', display: true },
	{ left: '[ ', right: ' ]', display: true }
];

// const DELIMITER_LIST = [
//     { left: '$$', right: '$$', display: false },
//     { left: '$', right: '$', display: false },
// ];

// const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
// const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

let inlinePatterns = [];
let blockPatterns = [];

function escapeRegex(string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function generateRegexRules(delimiters) {
	delimiters.forEach((delimiter) => {
		const { left, right, display } = delimiter;
		// Ensure regex-safe delimiters
		const escapedLeft = escapeRegex(left);
		const escapedRight = escapeRegex(right);

		if (!display) {
			inlinePatterns.push(
				`${escapedLeft}((?:\\\\[^]|[^\\\\])+?)${escapedRight}`
			);
		} else {
			blockPatterns.push(
				`${escapedLeft}((?:\\\\[^]|[^\\\\])+?)${escapedRight}`
			);
		}
	});

	const inlineRule = new RegExp(`^(${inlinePatterns.join('|')})(?=[\\s?!.,:？！。，：]|$)`, 'u');
	const blockRule = new RegExp(`^(${blockPatterns.join('|')})(?=[\\s?!.,:？！。，：]|$)`, 'u');

	return { inlineRule, blockRule };
}

const { inlineRule, blockRule } = generateRegexRules(DELIMITER_LIST);

export default function (options = {}) {
	return {
		extensions: [
			inlineKatex(options),
			blockKatex(options),
		]
	};
}

function katexStart(src, displayMode: boolean) {
	let ruleReg = displayMode ? blockRule : inlineRule;

	let indexSrc = src;

	while (indexSrc) {
		let index = -1;
		let startIndex = -1;
		let startDelimiter = '';
		let endDelimiter = '';
		for (let delimiter of DELIMITER_LIST) {
			if (delimiter.display !== displayMode) {
				continue;
			}

			startIndex = indexSrc.indexOf(delimiter.left);
			if (startIndex === -1) {
				continue;
			}

			index = startIndex;
			startDelimiter = delimiter.left;
			endDelimiter = delimiter.right;
		}

		if (index === -1) {
			return;
		}

		const f = index === 0 || indexSrc.charAt(index - 1) === ' ';
		if (f) {
			const possibleKatex = indexSrc.substring(index);

			if (possibleKatex.match(ruleReg)) {
				return index;
			}
		}

		indexSrc = indexSrc.substring(index + startDelimiter.length).replace(endDelimiter, '');
	}
}

function katexTokenizer(src, tokens, displayMode: boolean) {
	let ruleReg = displayMode ? blockRule : inlineRule;
	let type = displayMode ? 'blockKatex' : 'inlineKatex';

	const match = src.match(ruleReg);

	console.log("searching:", src);

	if (match) {
		const text = match
			.slice(2)
			.filter((item) => item)
			.find((item) => item.trim());

		return {
			type,
			raw: match[0],
			text: text,
			displayMode,
		};
	}
}



function inlineKatex(options) {
	return {
		name: 'inlineKatex',
		level: 'inline',
		start(src) {
			return katexStart(src, false);
		},
		tokenizer(src, tokens) {
			return katexTokenizer(src, tokens, false);
		},
	};
}

function blockKatex(options) {
	return {
		name: 'blockKatex',
		level: 'block',
		start(src) {
			return katexStart(src, true);
		},
		tokenizer(src, tokens) {
			return katexTokenizer(src, tokens, true);
		},
	};
}
