# Update Training Data Skill

When updating training data for the Jones Road copy tool:

## File Locations

Training data lives in `training-data/`:
- **Channels:** `channels/meta-ads.md`, `channels/email.md`, `channels/sms.md`, `channels/landing-page.md`, `channels/landing-page-listicle.md`, `channels/product-page.md`
- **Brand Voice:** `brand-voice/tone-guidelines.md`, `brand-voice/example-copy.md`
- **Personas:** `personas/` (one file per persona)
- **Products:** `products/products.json`
- **Frameworks:** `frameworks/` (awareness levels, market sophistication, unique mechanism)

## When Adding Examples

1. Match the existing format in that file
2. Include context (what product, what audience, why it worked)
3. Label as "winning" or "top performer" if it has proven results
4. Keep examples concise - the best parts only

## When Updating Frameworks

1. Read the existing framework first
2. Make surgical changes - don't rewrite everything
3. Explain the reasoning for the change
4. Preserve what's already working

## After Making Changes

1. Create a commit with a clear message describing what changed
2. Push to a branch (not main) for review
3. Offer to test by running the app locally if needed

## Commit Message Format

Use clear, specific messages:
- "Add 3 winning Q4 meta ads to training data"
- "Update SMS framework: reduce character limit to 120"
- "Add Dusty Rose Kit to products.json"
