#!/usr/bin/env python3
"""
Replace all blue colors in FRIDAY CRM with BL2020 color scheme (Orange/Gray/Black)
"""
import os
import re
import sys

# Color mapping: blue -> orange/gray
COLOR_MAPPING = {
    # Background colors
    'bg-blue-600': 'bg-orange-600',
    'bg-blue-700': 'bg-orange-700',
    'bg-blue-500': 'bg-orange-500',
    'bg-blue-50': 'bg-gray-50',
    'bg-blue-100': 'bg-gray-100',
    
    # Text colors
    'text-blue-600': 'text-orange-600',
    'text-blue-700': 'text-orange-700',
    'text-blue-800': 'text-gray-800',
    'text-blue-500': 'text-orange-500',
    
    # Border colors
    'border-blue-600': 'border-orange-600',
    'border-blue-500': 'border-orange-500',
    'border-l-blue-600': 'border-l-orange-600',
    
    # Ring colors (focus states)
    'ring-blue-500': 'ring-orange-500',
    'ring-blue-600': 'ring-orange-600',
    
    # Hover states
    'hover:bg-blue-700': 'hover:bg-orange-700',
    'hover:bg-blue-600': 'hover:bg-orange-600',
    'hover:bg-blue-50': 'hover:bg-gray-100',
    'hover:text-blue-600': 'hover:text-orange-600',
    'hover:text-blue-700': 'hover:text-orange-700',
}

def replace_colors_in_file(filepath):
    """Replace blue colors with orange/gray in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements = 0
        
        # Replace each color mapping
        for old_color, new_color in COLOR_MAPPING.items():
            if old_color in content:
                count = content.count(old_color)
                content = content.replace(old_color, new_color)
                replacements += count
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return replacements
        
        return 0
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        return 0

def process_directory(directory):
    """Process all .tsx and .ts files in directory"""
    total_replacements = 0
    files_changed = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css')):
                filepath = os.path.join(root, file)
                replacements = replace_colors_in_file(filepath)
                if replacements > 0:
                    files_changed += 1
                    total_replacements += replacements
                    print(f"✓ {filepath}: {replacements} replacements")
    
    return files_changed, total_replacements

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 replace_blue_colors.py <directory>")
        sys.exit(1)
    
    directory = sys.argv[1]
    
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a directory", file=sys.stderr)
        sys.exit(1)
    
    print(f"Processing directory: {directory}")
    print("=" * 60)
    
    files_changed, total_replacements = process_directory(directory)
    
    print("=" * 60)
    print(f"✓ Complete!")
    print(f"  Files changed: {files_changed}")
    print(f"  Total replacements: {total_replacements}")
