import assert from 'node:assert/strict';
import { test } from 'vitest';

import { processMarkdownHtml } from '../src/lib/utils/markdown.js';

/**
 * With `previewHardBreaks` off, a newline inside a paragraph is a `\n` in a
 * text node rather than a `<br>` (#967). The inputs are
 * `convert_markdown_with(markdown, false)` output, captured from comrak.
 */

function render(html: string): HTMLElement {
	const root = document.createElement('div');
	root.innerHTML = processMarkdownHtml(html, '/doc.md', new Set());
	return root;
}

function anchorLines(root: HTMLElement): number[] {
	return Array.from(root.querySelectorAll('.source-line-anchor'), (anchor) =>
		Number(anchor.getAttribute('data-sourcepos')?.split(':')[0]),
	);
}

test('a callout title ends at the soft break', () => {
	// "> [!NOTE] Title\n> Body line one\n> body line two\n"
	const root = render(
		'<blockquote data-sourcepos="1:1-3:15">\n' +
			'<p data-sourcepos="1:3-3:15">[!NOTE] Title\nBody line one\nbody line two</p>\n</blockquote>\n',
	);

	assert.equal(root.querySelector('.callout-title-inner')?.textContent, 'Title');
	assert.match(root.querySelector('.markdown-alert-content')?.textContent ?? '', /^\s*Body line one\s+body line two\s*$/);
});

test('a callout with no title keeps its first body line out of the title', () => {
	// "> [!NOTE]\n> Body line one\n> body line two\n"
	const root = render(
		'<blockquote data-sourcepos="1:1-3:15">\n' +
			'<p data-sourcepos="1:3-3:15">[!NOTE]\nBody line one\nbody line two</p>\n</blockquote>\n',
	);

	assert.equal(root.querySelector('.callout-title-inner')?.textContent, 'Note');
	assert.match(root.querySelector('.markdown-alert-content')?.textContent ?? '', /^\s*Body line one/);
});

test('inline math does not pair across a soft break', () => {
	// "a $b\nc$ d\n" — the backend masks math one line at a time.
	const root = render('<p data-sourcepos="1:1-2:4">a $b\nc$ d</p>\n');
	assert.equal(root.querySelector('p')?.textContent, 'a $b\nc$ d');
});

test('inline math on one line of a soft-wrapped paragraph still renders', () => {
	// "Costs $5 today\nand $x$ here\n"
	const root = render('<p data-sourcepos="1:1-2:21">Costs $5 today\nand $x$ here</p>\n');
	assert.match(root.querySelector('p')?.textContent ?? '', /and \\\(x\\\) here/);
});

test('a $$ block inside a soft-wrapped paragraph is display math', () => {
	// "The formula\n$$\nx^2\n$$\nis nice.\n"
	const root = render('<p data-sourcepos="1:1-5:8">The formula\n$$\nx^2\n$$\nis nice.</p>\n');
	assert.match(root.querySelector('p')?.textContent ?? '', /The formula\s+\\\[x\^2\\\]\s+is nice\./);
});

test('each soft break in a long paragraph gets a line anchor', () => {
	// "one *two\nthree* four\nfive `six` seven\neight\n"
	const root = render(
		'<p data-sourcepos="1:1-4:5">one <em data-sourcepos="1:5-2:6">two\nthree</em> four\n' +
			'five <code data-sourcepos="3:6-3:10">six</code> seven\neight</p>\n',
	);

	assert.deepEqual(anchorLines(root), [2, 3, 4]);
	assert.equal(root.querySelector('p')?.textContent, 'one two\nthree four\nfive six seven\neight');
});

test('a soft-wrapped tight list item gets line anchors', () => {
	// "- [ ] task one\n  line two\n  line three\n"
	const root = render(
		'<ul class="contains-task-list" data-sourcepos="1:1-3:12">\n' +
			'<li data-sourcepos="1:1-3:12"><input type="checkbox" data-task-checkbox="" ' +
			'class="task-list-item-checkbox" disabled="" /> task one\nline two\nline three</li>\n</ul>\n',
	);

	assert.deepEqual(anchorLines(root), [2, 3]);
});
