// Simple test to isolate the Snapback color detection issue
console.log('Testing Snapback color detection...');

// Simulate the pattern matching logic
const validColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                    'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                    'maroon', 'gold', 'charcoal', 'khaki', 'carolina', 'silver', 'teal',
                    'forest', 'burgundy', 'crimson', 'ivory', 'beige', 'tan', 'coral'];

const colorChangePatterns = [
    { pattern: /make\s+it\s+((?:\w+\/\w+)|(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)(?:\s+and\s+\w+)?)/i, confidence: 0.9 },
    { pattern: /change\s+(?:color\s+)?to\s+((?:\w+\/\w+)|(?:\w+(?:\s+and\s+\w+)?))(?!\s*-?\s*panel)/i, confidence: 0.95 },
    { pattern: /in\s+((?:\w+\/\w+)|(?:\w+(?:\s+and\s+\w+)?))(?!\s*-?\s*panel)/i, confidence: 0.8 }
];

const testMessage = "change to Snapback";

console.log(`\nTesting message: "${testMessage}"`);

for (let i = 0; i < colorChangePatterns.length; i++) {
    const { pattern, confidence } = colorChangePatterns[i];
    const match = testMessage.match(pattern);

    console.log(`\nPattern ${i + 1}: ${pattern.source}`);
    console.log(`Match result:`, match);

    if (match && match[1]) {
        let newColor = match[1].trim();
        console.log(`Captured color: "${newColor}"`);

        // Test validation logic
        let normalizedColor = newColor;
        let isValidColor = false;

        if (newColor.includes('/')) {
            const parts = newColor.split('/');
            if (parts.length === 2 &&
                validColors.includes(parts[0].toLowerCase()) &&
                validColors.includes(parts[1].toLowerCase())) {
                const part1 = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
                const part2 = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
                normalizedColor = `${part1}/${part2}`;
                isValidColor = true;
            }
        } else if (validColors.includes(newColor.toLowerCase())) {
            normalizedColor = newColor.charAt(0).toUpperCase() + newColor.slice(1).toLowerCase();
            isValidColor = true;
        }

        console.log(`Is valid color: ${isValidColor}`);
        console.log(`Should be skipped: ${!isValidColor}`);

        if (!isValidColor) {
            console.log(`✅ CORRECTLY skipped: ${newColor}`);
        } else {
            console.log(`❌ INCORRECTLY processed: ${newColor}`);
        }
    } else {
        console.log('No match');
    }
}