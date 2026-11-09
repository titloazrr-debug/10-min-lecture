export function renderMarkdown(source: string): string {
  const text = escapeHtml(source.replace(/\r\n/g, "\n").trim())
  if (text === "") return ""
  return text.split(/\n{2,}/).map((block) => renderBlock(block)).join("")
}

function renderBlock(block: string): string {
  const lines = block.split("\n")
  if (lines[0]?.startsWith("### ")) return `<h3>${inline(lines[0].slice(4))}</h3>`
  if (lines[0]?.startsWith("## ")) return `<h2>${inline(lines[0].slice(3))}</h2>`
  if (lines[0]?.startsWith("# ")) return `<h1>${inline(lines[0].slice(2))}</h1>`
  if (lines.every((line) => line.startsWith("&gt;") || line === "")) {
    const body = lines.map((line) => line.replace(/^&gt; ?/, "")).join(" ")
    return `<blockquote><p>${inline(body)}</p></blockquote>`
  }
  return `<p>${inline(lines.join("<br />"))}</p>`
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
}
