const fs = require('fs');

async function parseTally() {
  const html = fs.readFileSync('tally_utf8.txt', 'utf8');
  // Look for Next.js pre-loaded data
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const blocks = data.props.pageProps.blocks;
      const logic = data.props.pageProps.blocks.filter(b => b.type === 'CONDITIONAL_LOGIC');
      
      console.log("=== TALLY FORM FIELDS ===");
      blocks.forEach(b => {
        if (b.payload && b.payload.text) {
          console.log(`[${b.type}] ${b.payload.text}`);
        } else if (b.payload && b.payload.title) {
          console.log(`[${b.type}] ${b.payload.title}`);
        }
      });

      console.log("\n=== TALLY PRICING LOGIC ===");
      logic.forEach(l => {
        const conds = l.payload.conditionals.map(c => `${c.payload.field.title} ${c.payload.comparison} ${c.payload.value}`).join(' AND ');
        const actions = l.payload.actions.map(a => {
            if (a.type === 'CALCULATE') {
                return `SET ${a.payload.calculate.field.title} = ${a.payload.calculate.value}`;
            }
            return a.type;
        }).join(', ');
        console.log(`IF ${conds} THEN ${actions}`);
      });

    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  } else {
    console.log("Could not find __NEXT_DATA__ in HTML.");
  }
}

parseTally();

