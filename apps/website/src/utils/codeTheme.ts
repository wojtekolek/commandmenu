// A Shiki theme drawn from the site's own palette rather than an editor's:
// warm greys for the structure, the slate second voice for what the reader
// is meant to notice. Sits on primary-950.
const color = {
  text: "#dcdcdc", // primary-200
  muted: "#989898", // primary-400
  faint: "#7c7c7c", // primary-500
  bright: "#f4f4f4", // primary-50
  keyword: "#8097b1", // secondary-500
  tag: "#99aec1", // secondary-400
  string: "#bac9d6", // secondary-300
};

export const codeTheme = {
  name: "commandmenu",
  type: "dark" as const,
  colors: {
    "editor.background": "#292929",
    "editor.foreground": color.text,
  },
  tokenColors: [
    { settings: { foreground: color.text } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: color.faint } },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: color.faint },
    },
    {
      scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control"],
      settings: { foreground: color.keyword },
    },
    {
      scope: ["string", "punctuation.definition.string", "constant.language", "constant.numeric"],
      settings: { foreground: color.string },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call entity.name.function",
      ],
      settings: { foreground: color.bright },
    },
    {
      scope: ["entity.name.tag", "support.class.component", "entity.name.type", "support.type"],
      settings: { foreground: color.tag },
    },
    { scope: ["entity.other.attribute-name"], settings: { foreground: color.muted } },
    {
      scope: ["meta.object-literal.key", "support.variable.property"],
      settings: { foreground: color.muted },
    },
  ],
};
