import { MathJax } from 'better-react-mathjax';

const LATEX_DELIMITER_REGEX = /\\\(|\\\[|\$\$|\\begin\{/;
const SIMPLE_REPLACEMENTS = [
  { regex: /<=/g, value: '\\leq ' },
  { regex: />=/g, value: '\\geq ' },
  { regex: /!=/g, value: '\\neq ' }
];

const FRACTION_REGEX = /(\([^()]+\)|[A-Za-z\d]+)\s*\/\s*(\([^()]+\)|[A-Za-z\d]+)/g;
const POWER_REGEX = /(\b[A-Za-z\d]+)\^([A-Za-z\d]+)/g;
const SQRT_REGEX = /sqrt\((.*?)\)/g;

const SUBSCRIPT_REGEX = /([A-Za-z])([0-9]+)/g;

const normalizeCharacters = (text) =>
  text

    .replace(/\u2212/g, '-')

    .replace(/[\u{1D44E}-\u{1D467}]/gu, (char) => {
      const offset = char.codePointAt(0) - 0x1d44e;
      return String.fromCharCode('a'.charCodeAt(0) + offset);
    });

const autoFormatText = (text) => {

  if (!text || LATEX_DELIMITER_REGEX.test(text)) {
    return text;
  }

  let formatted = normalizeCharacters(text);

  const floatMarkers = [];
  formatted = formatted.replace(/(\d+\.\d+)/g, (match) => {
    const marker = `__FLOAT_${floatMarkers.length}__`;
    floatMarkers.push(match);
    return marker;
  });

  SIMPLE_REPLACEMENTS.forEach(({ regex, value }) => {
    formatted = formatted.replace(regex, value);
  });

  formatted = formatted.replace(SUBSCRIPT_REGEX, (_, base, sub) => `${base}_{${sub}}`);

  formatted = formatted
    .replace(SQRT_REGEX, (_, inner) => `\\sqrt{${inner}}`)
    .replace(POWER_REGEX, (_, base, exponent) => `${base}^{${exponent}}`);

  formatted = formatted.replace(FRACTION_REGEX, (_, num, den) => {
    const cleanNum = num.startsWith('(') && num.endsWith(')') ? num.slice(1, -1) : num;
    const cleanDen = den.startsWith('(') && den.endsWith(')') ? den.slice(1, -1) : den;
    return `\\frac{${cleanNum}}{${cleanDen}}`;
  });

  const MATH_BLOCK_REGEX = /([a-zA-Z0-9\s()[\]{}]*[=+\-*/^{}_\\<>][a-zA-Z0-9\s()[\]{}=+\-*/^{}_\\<>]*)/g;
  formatted = formatted.replace(MATH_BLOCK_REGEX, (match) => {
    const trimmed = match.trim();
    if (trimmed.length < 2 ||
        trimmed.startsWith('\\(') || trimmed.startsWith('\\[') || trimmed.startsWith('$$')) {
      return match;
    }
    return ` \\(${trimmed}\\) `;
  });

  floatMarkers.forEach((value, idx) => {
    formatted = formatted.replace(`__FLOAT_${idx}__`, value);
  });

  return formatted.replace(/\s{2,}/g, ' ').trim();
};

const LatexRenderer = ({ text, inline = false, className, style }) => {
  if (!text) return null;

  const processedText = autoFormatText(text);

  return (
    <div className={className} style={{ whiteSpace: 'pre-wrap', ...style }}>
      <MathJax dynamic inline={inline}>
        {processedText}
      </MathJax>
    </div>
  );
};

export default LatexRenderer;