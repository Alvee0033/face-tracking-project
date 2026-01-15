/**
 * PostCSS plugin to convert oklab() and oklch() color functions to RGB
 * This fixes the "unsupported color function oklab" error in Next.js and html2canvas
 * Uses a simple approximation algorithm without external dependencies
 */

// Simple oklab to RGB conversion (approximation)
function oklabToRgb(L, a, b, alpha = 1) {
  // Convert OKLab to linear RGB using the OKLab to linear sRGB matrix
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Apply gamma correction
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Convert to sRGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_ = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Clamp and convert to 0-255 range
  const r255 = Math.max(0, Math.min(255, Math.round(r * 255)));
  const g255 = Math.max(0, Math.min(255, Math.round(g * 255)));
  const b255 = Math.max(0, Math.min(255, Math.round(b_ * 255)));

  if (alpha !== undefined && alpha < 1) {
    return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
  }
  return `rgb(${r255}, ${g255}, ${b255})`;
}

// Simple oklch to RGB conversion (via oklab)
function oklchToRgb(L, C, h, alpha = 1) {
  // Convert OKLCH to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b, alpha);
}

const plugin = () => {
  return {
    postcssPlugin: 'postcss-oklab-to-rgb',
    OnceExit(root) {
      root.walkDecls(decl => {
        if (decl.value) {
          // Convert oklab() to rgb()
          decl.value = decl.value.replace(
            /oklab\(([^)]+)\)/gi,
            (match, args) => {
              try {
                // Parse oklab values: oklab(L a b) or oklab(L a b / alpha)
                const parts = args.trim().split(/\s*\/\s*/);
                const values = parts[0].trim().split(/\s+/).map(v => parseFloat(v));
                const alpha = parts[1] ? parseFloat(parts[1]) : undefined;
                
                if (values.length >= 3 && !isNaN(values[0]) && !isNaN(values[1]) && !isNaN(values[2])) {
                  const rgb = oklabToRgb(values[0], values[1], values[2], alpha);
                  return rgb;
                }
              } catch (e) {
                console.warn('Failed to convert oklab color:', match, e);
              }
              // Fallback to a safe color if conversion fails
              return 'rgb(128, 128, 128)';
            }
          );
          
          // Convert oklch() to rgb()
          decl.value = decl.value.replace(
            /oklch\(([^)]+)\)/gi,
            (match, args) => {
              try {
                // Parse oklch values: oklch(L C h) or oklch(L C h / alpha)
                const parts = args.trim().split(/\s*\/\s*/);
                const values = parts[0].trim().split(/\s+/).map(v => parseFloat(v));
                const alpha = parts[1] ? parseFloat(parts[1]) : undefined;
                
                if (values.length >= 3 && !isNaN(values[0]) && !isNaN(values[1]) && !isNaN(values[2])) {
                  const rgb = oklchToRgb(values[0], values[1], values[2], alpha);
                  return rgb;
                }
              } catch (e) {
                console.warn('Failed to convert oklch color:', match, e);
              }
              // Fallback to a safe color if conversion fails
              return 'rgb(128, 128, 128)';
            }
          );
        }
      });
    }
  };
};

plugin.postcss = true;

export default plugin;

