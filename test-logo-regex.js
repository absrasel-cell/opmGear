// Test logo regex pattern behavior
console.log('Testing logo regex patterns...\n');

const testText = '•Front: Rubber (Medium) - $2184.00 ($2.63/cap + $0.10 mold)';

// Pattern 1 from the code
const pattern1 = /•(Front|Back|Left|Right|Bills): ([^-\n]+) - (.+?)(?=\n|$)/gi;

console.log('Test text:', testText);
console.log('Pattern 1:', pattern1.source);

const matches = [...testText.matchAll(pattern1)];
console.log('Number of matches:', matches.length);

if (matches.length > 0) {
    const match = matches[0];
    console.log('Full match:', match[0]);
    console.log('Group 1 (Position):', match[1]);
    console.log('Group 2 (Logo type):', match[2]);
    console.log('Group 3 (Pricing):', match[3]);

    // Test the extraction logic
    let position = match[1];
    let logoType = match[2];
    let logoSize = match[3];

    console.log('\nAfter initial extraction:');
    console.log('position:', position);
    console.log('logoType:', logoType);
    console.log('logoSize:', logoSize);

    // Test the additional processing logic
    if (!logoSize && match[2]) {
        console.log('\nTriggering Pattern 1 processing logic...');
        const logoInfo = match[2];
        const logoTypeMatch = logoInfo.match(/(3D\s*Embroidery|Flat\s*Embroidery|Screen\s*Print|Rubber\s*Patch|Woven\s*Patch|Leather\s*Patch|Sublimation|Embroidery|Print|Patch)\s*\(([^)]+)\)/i);

        console.log('logoInfo:', logoInfo);
        console.log('logoTypeMatch:', logoTypeMatch);

        if (logoTypeMatch) {
            logoType = logoTypeMatch[1];
            logoSize = logoTypeMatch[2];
            console.log('Updated logoType:', logoType);
            console.log('Updated logoSize:', logoSize);
        } else {
            logoType = logoInfo.trim();
            logoSize = 'Medium';
            console.log('Default processing - logoType:', logoType);
            console.log('Default processing - logoSize:', logoSize);
        }
    } else {
        console.log('logoSize exists, skipping Pattern 1 processing');
    }

    console.log('\nFinal values:');
    console.log('Final position:', position);
    console.log('Final logoType:', logoType);
    console.log('Final logoSize:', logoSize);
}