const renderInline = (text) =>
  text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }

    return part;
  });

export default function MarkdownMessage({ content }) {
  const parts = String(content ?? "").split(/```/g);

  return (
    <div className="markdown-message">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const [, ...codeLines] = part.split("\n");
          const code = codeLines.length > 0 ? codeLines.join("\n") : part;

          return <pre key={`${index}-${code.slice(0, 20)}`}>{code.trim()}</pre>;
        }

        return part
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => (
            <p key={`${index}-${line}`}>{renderInline(line.replace(/^[-*]\s*/, ""))}</p>
          ));
      })}
    </div>
  );
}
