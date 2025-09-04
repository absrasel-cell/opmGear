#!/bin/bash
# Script to systematically remove all glass morphism effects and replace with solid design patterns

echo "Starting glass morphism removal process..."

# Find all .tsx and .ts files in the src directory
find src -name "*.tsx" -o -name "*.ts" | while read -r file; do
    echo "Processing: $file"
    
    # Backup original file
    cp "$file" "$file.backup-before-glass-removal"
    
    # Replace backdrop-blur classes
    sed -i 's/backdrop-blur-[a-zA-Z0-9]*//g' "$file"
    
    # Replace transparent background classes
    sed -i 's/bg-white\/5/bg-stone-700/g' "$file"
    sed -i 's/bg-white\/10/bg-stone-600/g' "$file"
    sed -i 's/bg-white\/15/bg-stone-600/g' "$file"
    sed -i 's/bg-white\/20/bg-stone-500/g' "$file"
    sed -i 's/bg-white\/30/bg-stone-500/g' "$file"
    
    sed -i 's/bg-black\/50/bg-black\/80/g' "$file"
    sed -i 's/bg-black\/60/bg-black/g' "$file"
    sed -i 's/bg-black\/70/bg-black/g' "$file"
    
    sed -i 's/bg-stone-800\/50/bg-stone-800/g' "$file"
    sed -i 's/bg-stone-800\/60/bg-stone-800/g' "$file"
    sed -i 's/bg-stone-900\/50/bg-stone-900/g' "$file"
    sed -i 's/bg-stone-900\/95/bg-stone-900/g' "$file"
    sed -i 's/bg-slate-900\/95/bg-slate-900/g' "$file"
    
    # Replace transparent border classes
    sed -i 's/border-white\/5/border-stone-700/g' "$file"
    sed -i 's/border-white\/10/border-stone-600/g' "$file"
    sed -i 's/border-white\/15/border-stone-500/g' "$file"
    sed -i 's/border-white\/20/border-stone-500/g' "$file"
    sed -i 's/border-white\/30/border-stone-400/g' "$file"
    
    sed -i 's/border-stone-700\/50/border-stone-700/g' "$file"
    sed -i 's/border-stone-800\/50/border-stone-800/g' "$file"
    
    # Replace hover states
    sed -i 's/hover:bg-white\/5/hover:bg-stone-700/g' "$file"
    sed -i 's/hover:bg-white\/10/hover:bg-stone-600/g' "$file"
    sed -i 's/hover:bg-white\/15/hover:bg-stone-600/g' "$file"
    sed -i 's/hover:bg-white\/20/hover:bg-stone-500/g' "$file"
    
    sed -i 's/hover:bg-stone-700\/50/hover:bg-stone-700/g' "$file"
    sed -i 's/hover:bg-stone-800\/50/hover:bg-stone-800/g' "$file"
    
    # Replace text transparency
    sed -i 's/text-white\/90/text-white/g' "$file"
    sed -i 's/text-white\/85/text-white/g' "$file"
    sed -i 's/text-white\/80/text-stone-200/g' "$file"
    sed -i 's/text-white\/70/text-stone-300/g' "$file"
    sed -i 's/text-white\/60/text-stone-300/g' "$file"
    sed -i 's/text-white\/50/text-stone-400/g' "$file"
    
    # Replace ring classes
    sed -i 's/ring-white\/5/ring-stone-700/g' "$file"
    sed -i 's/ring-white\/10/ring-stone-600/g' "$file"
    sed -i 's/ring-white\/20/ring-stone-500/g' "$file"
    
    # Replace specific color transparencies in gradients
    sed -i 's/from-purple-500\/10/from-purple-900/g' "$file"
    sed -i 's/via-blue-500\/10/via-blue-900/g' "$file"
    sed -i 's/to-cyan-500\/10/to-cyan-900/g' "$file"
    sed -i 's/from-blue-500\/10/from-blue-900/g' "$file"
    sed -i 's/to-purple-500\/10/to-purple-900/g' "$file"
    sed -i 's/from-green-500\/10/from-green-900/g' "$file"
    sed -i 's/to-blue-500\/10/to-blue-900/g' "$file"
    
    # Replace color transparencies in backgrounds
    sed -i 's/bg-orange-500\/15/bg-orange-900/g' "$file"
    sed -i 's/bg-purple-500\/15/bg-purple-900/g' "$file"
    sed -i 's/bg-blue-500\/15/bg-blue-900/g' "$file"
    sed -i 's/bg-green-500\/15/bg-green-900/g' "$file"
    sed -i 's/bg-red-500\/15/bg-red-900/g' "$file"
    sed -i 's/bg-yellow-500\/15/bg-yellow-900/g' "$file"
    
    sed -i 's/bg-orange-500\/30/bg-orange-600/g' "$file"
    sed -i 's/bg-purple-500\/30/bg-purple-600/g' "$file"
    sed -i 's/bg-blue-500\/30/bg-blue-600/g' "$file"
    
    # Replace border color transparencies
    sed -i 's/border-orange-500\/30/border-orange-500/g' "$file"
    sed -i 's/border-purple-500\/30/border-purple-500/g' "$file"
    sed -i 's/border-blue-500\/30/border-blue-500/g' "$file"
    sed -i 's/border-green-500\/30/border-green-500/g' "$file"
    sed -i 's/border-red-500\/30/border-red-500/g' "$file"
    sed -i 's/border-yellow-500\/30/border-yellow-500/g' "$file"
    
    sed -i 's/border-orange-400\/30/border-orange-400/g' "$file"
    sed -i 's/ring-orange-400\/30/ring-orange-400/g' "$file"
    sed -i 's/ring-purple-400\/30/ring-purple-400/g' "$file"
    sed -i 's/ring-blue-400\/30/ring-blue-400/g' "$file"
    sed -i 's/ring-green-400\/30/ring-green-400/g' "$file"
    sed -i 's/ring-red-400\/30/ring-red-400/g' "$file"
    sed -i 's/ring-yellow-400\/30/ring-yellow-400/g' "$file"
    
    sed -i 's/border-orange-400\/20/border-orange-500/g' "$file"
    
    # Fix text colors with transparency
    sed -i 's/text-orange-200\/90/text-orange-200/g' "$file"
    sed -i 's/text-purple-200\/90/text-purple-200/g' "$file"
    sed -i 's/text-blue-200\/90/text-blue-200/g' "$file"
    sed -i 's/text-green-200\/90/text-green-200/g' "$file"
    sed -i 's/text-red-200\/90/text-red-200/g' "$file"
    sed -i 's/text-yellow-200\/90/text-yellow-200/g' "$file"
    
    # Clean up any double spaces that may have been created
    sed -i 's/  / /g' "$file"
    
    echo "Completed: $file"
done

echo "Glass morphism removal completed for all files!"
echo "Backup files created with .backup-before-glass-removal extension"