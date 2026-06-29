#!/bin/bash
# Monthly transparency report — runs on 2nd of each month
# Publishes previous month's report in 4 languages, then busts ISR cache.
export PATH="/Users/peter/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:$PATH"
cd /Users/peter/wildlyplay

node scripts/transparency-report-publish.mjs --publish 2>&1

# Bust ISR cache
curl -s "https://www.wildlyplay.com/api/revalidate?tag=posts" > /dev/null
