// Placeholder utility - replace with a robust library like lodash.isEqual or fast-deep-equal
export function deepEqual(a: any, b: any): boolean {
    // Basic implementation for demonstration - prone to errors with Dates, RegExps, order, etc.
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
        // Handle circular references or other stringify issues
        console.error("deepEqual comparison failed:", e);
        return false;
    }
} 