---
name: petlist-format
description: Keep PetList TypeScript and React files readable and consistently formatted when editing .ts or .tsx files in this repository.
---

# Format PetList code

PetList uses the repository's Prettier configuration, with an 80-column target,
two-space indentation, and one JSX attribute per line. Preserve behavior while
formatting; extract a named helper only when formatting alone leaves a dense
expression hard to understand.

After changing `.ts` or `.tsx` files, run `npm run format:check`. If it fails,
run `npm run format` (or format only the touched files with the local Prettier
binary), review the diff, and run the check again. Run the relevant type,
test, and build checks for the actual code change.
