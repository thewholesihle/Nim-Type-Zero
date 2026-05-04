// Local development server — not used on Netlify.
// For Netlify, only the /public folder is deployed (see netlify.toml).
const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Fallback — serve index.html for any unknown route
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`server running on ${PORT}`));
