import { useEffect, useRef, useState } from "react";
import { CheckIcon, XIcon } from "../icons";
import { IconButton } from "../ui";

export interface InlineMathEditorProps {
  initialLatex: string;
  onSubmit: (latex: string) => void;
  onCancel: () => void;
}

export const InlineMathEditor = ({
  initialLatex,
  onSubmit,
  onCancel,
}: InlineMathEditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [latex, setLatex] = useState(initialLatex);

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(latex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Tab") {
      e.stopPropagation();
    }
  };

  return (
    <div className="flex flex-col gap-1.5 bg-bg border border-border rounded-lg shadow-md p-1.5 w-72">
      <input
        ref={inputRef}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter KaTeX expression..."
        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="flex items-center justify-end gap-1 mr-0.5 mb-0.5">
        <IconButton
          type="button"
          onClick={() => onSubmit(latex)}
          title="Apply (Enter)"
          size="xs"
          variant="ghost"
        >
          <CheckIcon className="w-4.5 h-4.5 stroke-[1.5]" />
        </IconButton>
        <IconButton
          type="button"
          onClick={onCancel}
          title="Cancel"
          size="xs"
          variant="ghost"
        >
          <XIcon className="w-4.5 h-4.5 stroke-[1.5]" />
        </IconButton>
      </div>
    </div>
  );
};
