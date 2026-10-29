import { InputRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";

export function normalizeBlockMath(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^\$\$([\s\S]*?)\$\$$/);
  return (match?.[1] ?? trimmed).trim();
}

export const ScratchBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) return;

          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex }),
          );
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const onClick = this.options.onClick;
    return [
      new Plugin({
        key: new PluginKey("blockMathSelection"),
        view() {
          return {
            // Clear native DOM selection when a blockMath node is selected.
            // ProseMirror's NodeSelection sets a DOM selection that spans all
            // content before the atom node, causing a visible highlight bleed.
            update(view) {
              const { selection } = view.state;
              if (
                selection instanceof NodeSelection &&
                selection.node.type.name === "blockMath"
              ) {
                window.getSelection()?.removeAllRanges();
              }
            },
          };
        },
        props: {
          // Open editor on Enter or Space when a blockMath node is selected
          handleKeyDown(view, event) {
            if (event.key !== "Enter" && event.key !== " ") return false;
            const { selection } = view.state;
            if (
              selection instanceof NodeSelection &&
              selection.node.type.name === "blockMath" &&
              onClick
            ) {
              event.preventDefault();
              onClick(selection.node, selection.from);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

// Inline math uses a single `$` on both sides: `$x^2$`.
// `$$...$$` stays reserved for block level math.
const INLINE_MATH_PATTERN = /^\$([^$\n]+?)\$(?!\$|\d)/;

// Amounts such as `100`, `9.9` or `100 and 200` are prices, not formulas.
const CURRENCY_PATTERN = /^\d[\d.,]*(?:\s+[\p{L}\d.,]+)*$/u;

/**
 * Check whether the text between two `$` delimiters can be a formula.
 *
 * Currency style writes (`$100`, `$100 and $200`, `价格 $9.9 元`) have to stay
 * plain text, so the content must look like LaTeX instead of an amount.
 */
export function isInlineMathContent(content: string): boolean {
  if (!content) return false;
  // Formulas never start or end with whitespace: `$ x $` is prose, not math.
  if (content !== content.trim()) return false;
  return !CURRENCY_PATTERN.test(content);
}

export const ScratchInlineMath = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        // The leading group keeps the character in front of the formula, so the
        // replacement starts at the first `$` instead of swallowing it.
        find: /(^|[^$])\$([^$\n]+?)\$$/,
        handler: ({ state, range, match }) => {
          const content = match[2] ?? "";
          if (!isInlineMathContent(content)) return;

          state.tr.replaceWith(
            range.from + match[1].length,
            range.to,
            this.type.create({ latex: content.trim() }),
          );
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "inlineMath",
    level: "inline",
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      const match = src.match(INLINE_MATH_PATTERN);
      if (!match) return undefined;

      const content = match[1] ?? "";
      if (!isInlineMathContent(content)) return undefined;

      return {
        type: "inlineMath",
        raw: match[0],
        latex: content.trim(),
      };
    },
  },
});
