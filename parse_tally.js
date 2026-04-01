const fs = require('fs');

async function parseTally() {
  const html = fs.readFileSync('tally_utf8.txt', 'utf8');
  const match = html.match(/window\.__TALLY_FORM__\s*=\s*(\{.*?\})\s*;/);
  if (match) {
    const form = JSON.parse(match[1]);
    console.log("=== TALLY FORM FIELDS ===");
    form.blocks.forEach(b => {
      if (b.payload && b.payload.label) {
        console.log(`[${b.type}] ${b.payload.label}`);
      }
    });
  } else {
    // try finding blocks arrays directly
    const matchBlocks = html.match(/"blocks":(\[.*?\]),"translations"/);
    if (matchBlocks) {
      const blocks = JSON.parse(matchBlocks[1]);
      console.log("=== TALLY FORM FIELDS ===");
      blocks.forEach(b => {
        if (b.payload && b.payload.label) {
          console.log(`[${b.type}] ${b.payload.label}`);
        }
      });
    } else {
      console.log("Could not find Tally form blocks in HTML.");
    }
  }
}

parseTally();
