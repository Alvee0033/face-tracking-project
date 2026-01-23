#!/bin/bash

# Script to remove CommonNavbar from all candidate pages since it's now in layout

FILES=(
  "app/candidate/jobs/page.tsx"
  "app/candidate/jobs/[id]/page.tsx"
  "app/candidate/dashboard/page.tsx"
  "app/candidate/interested-jobs/page.tsx"
  "app/candidate/saved-jobs/page.tsx"
  "app/candidate/hope/page.tsx"
  "app/candidate/roadmap/page.tsx"
  "app/candidate/inbox/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Remove import line
    sed -i '/import { CommonNavbar }/d' "$file"
    # Remove CommonNavbar component usage
    sed -i '/<CommonNavbar \/>/d' "$file"
  fi
done

echo "Done removing CommonNavbar from pages!"
