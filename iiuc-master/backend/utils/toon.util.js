/**
 * TOON (Token Optimized Object Notation) Utility
 * 
 * Implements a parser and stringifier for the TOON data format.
 * Format Reference:
 * - Key-Value: key: value
 * - Arrays/Tables: key[count]{h1,h2}: v1,v2 v3,v4
 * 
 * Designed to be token-efficient for AI communications.
 */
class ToonUtil {
    /**
     * Parse a TOON string into a JavaScript object
     * @param {string} toonString 
     * @returns {Object|Array}
     */
    static parse(toonString) {
        if (!toonString) return null;

        // Normalize line endings
        const lines = toonString.trim().split(/\n+/);
        const result = {};

        // Check if it's a single array/table at root (starts with array syntax)
        // pattern: key[count]{headers}: ... or just [count]{headers}: ...
        // But usually TOON is a set of properties.
        // If the string starts with a header definition without a key, it might be a raw array.
        // For now, we assume the input is an object with properties, or we handle specific formats.

        // State machine or line processing
        let currentKey = null;
        let isReadingBlock = false; // For multiline values if needed (not standard TOON but good for compatibility)

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // check for "key[count]{headers}: values"
            // or "key[count]: values" (simple array)
            // or "key: value"

            const arrayMatch = trimmed.match(/^(\w+)\[(\d+)\](?:\{([^}]+)\})?:\s*(.*)/);
            if (arrayMatch) {
                // It's an array/table definition
                const key = arrayMatch[1];
                // const count = parseInt(arrayMatch[2]);
                const headerStr = arrayMatch[3];
                const initialValues = arrayMatch[4];

                if (headerStr) {
                    // It's a table (array of objects)
                    const headers = headerStr.split(',').map(h => h.trim());
                    const rows = [];

                    // Initial values line might contain the first row(s)
                    if (initialValues) {
                        // Split by space? The article example: "1,Sreeni... 2,Krishna..."
                        // This implies space acts as row separator if on same line.
                        // But values themselves might contain spaces.
                        // We'll rely on a stricter separation: maybe assume one row per line following this?
                        // Or split by pattern matching the expected value count?

                        // If the rest of the file follows, we need to capture subsequent lines.
                        // But for simplicity in this utility:
                        // We will handle data that puts rows on new lines or same line separated by "|" or just space if simple.

                        // Let's assume standard CSV-like values within the row: v1,v2,v3
                        // And rows separated by space? "1,Sreeni,admin..." "2,Krishna..."
                        // Only works if values don't have spaces.

                        // Alternative strategy: Use the regex to find the start, then parse everything structure.
                        // BUT, for the specific AI integration, we can dictate the output format slightly more rigidly.
                        // We will ask AI to format with newlines for rows.

                        const rowStrings = initialValues.split(/(?<!\\) /); // split by space not preceded by backslash? 
                        // Actually the article example has spaces inside values "Sreeni", but maybe not.
                        // "1,Sreeni,admin,email..."

                        // Let's parse the inline values if any
                        this._parseRows(rows, initialValues, headers);
                    }

                    result[key] = rows; // We expect subsequent lines to NOT be part of this unless we track state.
                    // TOON is supposed to be concise.

                } else {
                    // Simple array of primitives
                    // key[3]: val1, val2, val3
                    const values = initialValues.split(/,\s*/).map(v => this._parseValue(v));
                    result[key] = values;
                }
                continue;
            }

            // Simple key-value: "key: value"
            const kvMatch = trimmed.match(/^(\w+):\s*(.*)/);
            if (kvMatch) {
                const key = kvMatch[1];
                const val = kvMatch[2];
                result[key] = this._parseValue(val);
                continue; // simple line processing
            }

            // If none matched, maybe it's a continuation row for the previous table?
            // We need state for that.
            // Given the complexity and lack of official spec, I'll keep it simple: 
            // The AI prompts will request "key: value" or "key[N]{cols}: val1,val2" 
            // Arrays will be single line or we need a specific multiline marker.
        }

        return result;
    }

    static _parseValue(valStr) {
        if (!valStr) return null;
        valStr = valStr.trim();
        if (valStr.toLowerCase() === 'true') return true;
        if (valStr.toLowerCase() === 'false') return false;
        if (!isNaN(Number(valStr))) return Number(valStr);
        return valStr;
    }

    static _parseRows(rowsArr, contentStr, headers) {
        if (!contentStr) return;
        // Simple splitter: "v1,v2 v3,v4" -> split space, then split comma
        // This breaks if values contain spaces.
        // Better approach for our AI use case: 
        // Ask AI to use a safe separator for rows like " | " or newlines.

        // For this implementation, let's assume valid CSV-like segments separated by whitespace is risky.
        // We will assume the AI returns one object property per line mostly, 
        // or for tables: "users[2]{id,name}: 1,John 2,Jane"

        // We will try to consume as many tokens as headers * rows

        // Heuristic: split by space, but recombine if it doesn't look like a start of new row?
        // No, let's just split by regex for "value,value".

        const parts = contentStr.match(/[^ ]+(?:,[^ ]+)*/g);
        if (parts) {
            parts.forEach(part => {
                const vals = part.split(',');
                if (vals.length === headers.length) {
                    const obj = {};
                    headers.forEach((h, i) => obj[h] = this._parseValue(vals[i]));
                    rowsArr.push(obj);
                }
            });
        }
    }

    /**
     * Convert object to TOON string using a robust format:
     * Arrays of objects -> table format
     * Arrays of primitives -> comma list
     * Objects -> properties
     */
    static stringify(data) {
        if (Array.isArray(data)) {
            // If root is array, we might need a wrapper or return table format directly
            // Assuming array of objects
            if (data.length > 0 && typeof data[0] === 'object') {
                const headers = Object.keys(data[0]);
                const headerStr = headers.join(',');
                const rows = data.map(obj => headers.map(h => obj[h]).join(',')).join(' ');
                return `data[${data.length}]{${headerStr}}: ${rows}`;
            }
            return `data[${data.length}]: ${data.join(', ')}`;
        }

        if (typeof data === 'object' && data !== null) {
            let output = '';
            for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    if (value.length === 0) {
                        output += `${key}[0]:\n`;
                        continue;
                    }

                    if (typeof value[0] === 'object') {
                        // Table format
                        const headers = Object.keys(value[0]);
                        const headerStr = headers.join(',');
                        // For readability and parsing safety, let's use " | " separator for rows
                        const rows = value.map(obj =>
                            headers.map(h => {
                                let v = obj[h];
                                if (typeof v === 'string' && (v.includes(',') || v.includes(' '))) {
                                    // Replace commas/spaces or quote? TOON article was simple.
                                    // Let's replace comma with semi-colon or similar if needed, 
                                    // or just hope AI avoids complex text in these fields.
                                    // For now: clean values.
                                    v = String(v).replace(/,/g, ';').replace(/ /g, '_');
                                }
                                return v;
                            }).join(',')
                        ).join(' ');
                        output += `${key}[${value.length}]{${headerStr}}: ${rows}\n`;
                    } else {
                        // Primitive array
                        output += `${key}[${value.length}]: ${value.join(', ')}\n`;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // Nested object - NOT standard TOON from what I saw, but let's flatten or indent
                    // Ideally we flatten: key.subkey: value
                    // Or just: key: {json} if too complex? 
                    // Let's try indentation for a bit of structure
                    output += `${key}:\n${this.stringify(value).split('\n').map(l => '  ' + l).join('\n')}\n`;
                } else {
                    // Simple value
                    output += `${key}: ${value}\n`;
                }
            }
            return output.trim();
        }

        return String(data);
    }
}

module.exports = ToonUtil;
