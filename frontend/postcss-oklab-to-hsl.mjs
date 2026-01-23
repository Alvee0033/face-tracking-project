/**
 * PostCSS plugin to convert oklab() and oklch() color functions to HSL
 * This fixes the "unsupported color function oklab" error in Next.js
 */
import { converter } from 'culori';

// Create converter from oklab/oklch to HSL
const toHsl = converter('hsl');

const plugin = () => {
  return {
    postcssPlugin: 'postcss-oklab-to-hsl',
    OnceExit(root) {
      root.walkDecls(decl => {
        if (decl.value) {
          // Convert oklab() to hsl()
          decl.value = decl.value.replace(
            /oklab\(([^)]+)\)/gi,
            (match, args) => {
              try {
                // Parse oklab values: oklab(L a b)
                const values = args.trim().split(/\s+/).map(v => parseFloat(v));
                if (values.length >= 3) {
                  const oklabColor = {
                    mode: 'oklab',
                    l: values[0],
                    a: values[1],
                    b: values[2],
                    alpha: values[3] !== undefined ? values[3] : 1
                  };
                  const hsl = toHsl(oklabColor);
                  if (hsl) {
                    // Format as modern HSL: hsl(h s% l%)
                    const h = Math.round(hsl.h || 0);
                    const s = Math.round((hsl.s || 0) * 100);
                    const l = Math.round((hsl.l || 0) * 100);
                    const alpha = hsl.alpha !== undefined && hsl.alpha !== 1 
                      ? ` / ${hsl.alpha}` 
                      : '';
                    return `hsl(${h} ${s}% ${l}%${alpha})`;
                  }
                }
              } catch (e) {
                console.warn('Failed to convert oklab color:', match, e);
              }
              return match; // Return original if conversion fails
            }
          );
          
          // Convert oklch() to hsl()
          decl.value = decl.value.replace(
            /oklch\(([^)]+)\)/gi,
            (match, args) => {
              try {
                // Parse oklch values: oklch(L C h)
                const values = args.trim().split(/\s+/).map(v => parseFloat(v));
                if (values.length >= 3) {
                  const oklchColor = {
                    mode: 'oklch',
                    l: values[0],
                    c: values[1],
                    h: values[2],
                    alpha: values[3] !== undefined ? values[3] : 1
                  };
                  const hsl = toHsl(oklchColor);
                  if (hsl) {
                    // Format as modern HSL: hsl(h s% l%)
                    const h = Math.round(hsl.h || 0);
                    const s = Math.round((hsl.s || 0) * 100);
                    const l = Math.round((hsl.l || 0) * 100);
                    const alpha = hsl.alpha !== undefined && hsl.alpha !== 1 
                      ? ` / ${hsl.alpha}` 
                      : '';
                    return `hsl(${h} ${s}% ${l}%${alpha})`;
                  }
                }
              } catch (e) {
                console.warn('Failed to convert oklch color:', match, e);
              }
              return match; // Return original if conversion fails
            }
          );
        }
      });
    }
  };
};

plugin.postcss = true;

export default plugin;

