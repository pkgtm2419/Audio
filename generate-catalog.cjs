/**
 * Catalog Generator for Audio Repository
 * Scans audio files (in 'songs/' folder or root), parses ID3 tags & filenames,
 * cleans metadata, generates vibrant cover art palettes, and outputs songs.json & songs.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac']);

// Noise patterns to strip from titles
const NOISE_PATTERNS = [
  /\[.*?y2mate.*?\]/gi,
  /\by2mate\.[a-z0-9.]+\s*-\s*/gi,
  /\b(official\s*(music\s*)?video|full\s*(video|song|audio)|lyric(al)?\s*(video)?)\b/gi,
  /\b(latest\s*punjabi\s*songs?|new\s*punjabi\s*songs?|punjabi\s*songs?)\b/gi,
  /\b(t-?series(\s*apna\s*punjab)?|white\s*hill(\s*music)?|speed\s*records|zee\s*music\s*(company)?|malwa\s*records|desi\s*melodies|geet\s*mp3|dm\s*records|yrf|tips\s*official)\b/gi,
  /\b(tiktok\s*viral|viral\s*hit|trending\s*song|hit\s*song|audio\s*song)\b/gi,
  /\b(1080p|720p|4k|hd|hq|128\s*kbps|192\s*kbps|320\s*kbps|mp3|conv)\b/gi,
  /\b(raag\.fm|whatashort|the\s*social\s*house|unheard\s*delhi|unerase\s*poetry)\b/gi,
  /\s*-\s*topic\b/gi,
  /\|/g
];

// Helper to decode ID3 strings with proper UTF-16 BE/LE handling
function decodeID3String(encoding, buf) {
  if (!buf || buf.length === 0) return '';
  try {
    if (encoding === 0) {
      return buf.toString('latin1');
    }
    if (encoding === 3) {
      return buf.toString('utf8');
    }
    if (encoding === 1) {
      // UTF-16 with BOM
      if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        // Big Endian: swap bytes
        const swapped = Buffer.alloc(buf.length - 2);
        for (let i = 2; i + 1 < buf.length; i += 2) {
          swapped[i - 2] = buf[i + 1];
          swapped[i - 1] = buf[i];
        }
        return swapped.toString('utf16le');
      } else if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        // Little Endian
        return buf.slice(2).toString('utf16le');
      }
      return buf.toString('utf16le');
    }
    if (encoding === 2) {
      // UTF-16BE without BOM
      const swapped = Buffer.alloc(buf.length);
      for (let i = 0; i + 1 < buf.length; i += 2) {
        swapped[i] = buf[i + 1];
        swapped[i + 1] = buf[i];
      }
      return swapped.toString('utf16le');
    }
    return buf.toString('utf8');
  } catch (e) {
    return buf.toString('utf8');
  }
}

// Helper to clean strings
function cleanString(str) {
  if (!str) return '';
  let cleaned = str;
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  // Remove file extension if present in title
  cleaned = cleaned.replace(/\.(mp3|ogg|wav|m4a|flac)$/i, '');
  // Remove smart quotes, hashtags, and empty parentheses
  cleaned = cleaned.replace(/[“”"']/g, '');
  cleaned = cleaned.replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, ' ');
  // Remove trailing/leading punctuation, colons, brackets, spaces, dashes
  cleaned = cleaned.replace(/^[#:`\s\-_()[\]{}]+|[#:`\s\-_()[\]{}]+$/g, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  return cleaned.trim();
}

// Generate deterministic HSL gradient based on string hash
function generateGradient(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 50 + (Math.abs(hash >> 3) % 90)) % 360;
  return {
    h1,
    h2,
    gradient: `linear-gradient(135deg, hsl(${h1}, 75%, 45%), hsl(${h2}, 80%, 25%))`
  };
}

// Extract ID3v2 tags from file buffer
function parseID3v2(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);

    if (header.toString('latin1', 0, 3) !== 'ID3') {
      fs.closeSync(fd);
      return null;
    }

    const version = header[3];
    const tagSize = ((header[6] & 0x7f) << 21) |
                    ((header[7] & 0x7f) << 14) |
                    ((header[8] & 0x7f) << 7) |
                    (header[9] & 0x7f);

    const readSize = Math.min(tagSize, 128 * 1024); // read up to 128KB
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 10);
    fs.closeSync(fd);

    const tags = {};
    let offset = 0;

    while (offset + 10 < buf.length) {
      const frameId = buf.toString('ascii', offset, offset + 4);
      if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

      let frameSize = 0;
      if (version === 4) {
        frameSize = ((buf[offset + 4] & 0x7f) << 21) |
                    ((buf[offset + 5] & 0x7f) << 14) |
                    ((buf[offset + 6] & 0x7f) << 7) |
                    (buf[offset + 7] & 0x7f);
      } else {
        frameSize = buf.readUInt32BE(offset + 4);
      }

      if (frameSize <= 0 || offset + 10 + frameSize > buf.length) break;

      if (['TIT2', 'TPE1', 'TALB', 'TYER', 'TDRC', 'TCON'].includes(frameId)) {
        const encoding = buf[offset + 10];
        const valBuf = buf.slice(offset + 11, offset + 10 + frameSize);
        const val = decodeID3String(encoding, valBuf);
        tags[frameId] = val.replace(/\0/g, '').trim();
      }

      offset += 10 + frameSize;
    }
    return tags;
  } catch (err) {
    return null;
  }
}

// Detect genre / categories from title, artist, and filename
function detectCategories(text) {
  const categories = new Set();
  const lower = text.toLowerCase();

  if (/(punjabi|jatt|mann|sidhu|dosanjh|grewal|gill|aulakh|chahal|dhillon|sandhu|b praak|jaani|ammy virk|hardy sandhu|karan aujla)/.test(lower)) {
    categories.add('Punjabi');
  }
  if (/(arijit|pritam|shreya|neha kakkar|tony kakkar|jubin|sanam|badshah|honey singh|armaan malik|rochak|atif aslam|kumar sanu|udit narayan|alka yagnik|lata|kishore)/.test(lower)) {
    categories.add('Bollywood');
  }
  if (/(sufi|qawwal|nusrat|rahat|kailash kher|sahir ali bagga|ali mola|dam dam|tajdar|khuda|allah)/.test(lower)) {
    categories.add('Sufi');
  }
  if (/(badshah|honey singh|dino james|carryminati|rap|hip-?hop|vilen|ikka|raftaar|emiway)/.test(lower)) {
    categories.add('Rap');
  }
  if (/(lo-?fi|lofi|unplugged|acoustic|reprise|cover|slowed|ambient)/.test(lower)) {
    categories.add('Lo-Fi');
  }
  if (/(poetry|poem|abhash jha|rahgir|spoken word|shayari|sukoon)/.test(lower)) {
    categories.add('Poetry');
  }
  if (/(shiv|tandav|mahadev|chalisa|bhagat|krishna|radha|aarti|bhajan|stotram|om)/.test(lower)) {
    categories.add('Devotional');
  }
  if (/(love|pyaar|pyar|dil|bewafa|ishq|mohabbat|deewana|saajan|humsafar|sanam)/.test(lower)) {
    categories.add('Romantic');
  }

  if (categories.size === 0) {
    categories.add('General');
  }

  return Array.from(categories);
}

// Recursively find all audio files in directories
function findAudioFiles(baseDir) {
  const results = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git' && entry.name !== 'node_modules') {
        results.push(...findAudioFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// Main scanner
function generateCatalog(rootDir = '.') {
  console.log(`Scanning audio files in "${path.resolve(rootDir)}"...`);
  
  // Look in 'songs' subdirectory if it exists, otherwise root
  const songsDir = path.join(rootDir, 'songs');
  const targetDir = fs.existsSync(songsDir) ? songsDir : rootDir;
  const audioFilePaths = findAudioFiles(targetDir);

  const songs = [];

  for (const fullPath of audioFilePaths) {
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    const filename = path.basename(fullPath);
    const ext = path.extname(filename).toLowerCase();
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const id3 = parseID3v2(fullPath) || {};
    const baseName = path.basename(filename, ext);

    // Extract raw title and artist
    let rawTitle = id3.TIT2 || baseName;
    let rawArtist = id3.TPE1 || '';

    // If ID3 title looks corrupted or has unprintable chars, use baseName
    if (!rawTitle || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(rawTitle)) {
      rawTitle = baseName;
    }

    // Clean artist: remove "- Topic", labels, etc.
    rawArtist = rawArtist.replace(/\s*-\s*topic\b/gi, '').trim();
    if (/^(t-?series|records|music|company|studio|official)/i.test(rawArtist)) {
      rawArtist = '';
    }

    // Parse artist from filename or rawTitle if missing
    if (!rawArtist) {
      if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        if (parts.length >= 2) {
          rawArtist = parts[1].trim();
          rawTitle = parts[0].trim();
        }
      } else if (rawTitle.toLowerCase().includes(' by ')) {
        const parts = rawTitle.split(/\s+by\s+/i);
        rawTitle = parts[0].trim();
        rawArtist = parts[1].trim();
      } else if (rawTitle.toLowerCase().includes(' ft. ') || rawTitle.toLowerCase().includes(' feat ')) {
        const parts = rawTitle.split(/\s+(?:ft\.?|feat\.?)\s+/i);
        rawTitle = parts[0].trim();
        rawArtist = parts[1].trim();
      }
    }

    let cleanTitle = cleanString(rawTitle) || cleanString(baseName);
    let cleanArtist = cleanString(rawArtist);

    if (!cleanArtist) {
      // Known popular artist heuristics from text
      const combined = `${cleanTitle} ${baseName}`;
      const artists = [
        'Arijit Singh', 'B Praak', 'Jaani', 'Badshah', 'Yo Yo Honey Singh',
        'Manan Bhardwaj', 'Sahir Ali Bagga', 'Kailash Kher', 'Sanam', 'Dino James',
        'Jass Manak', 'Akhil', 'Ninja', 'Ammy Virk', 'Jassi Gill', 'Hardy Sandhu',
        'Sharry Mann', 'Bilal Saeed', 'Darshan Raval', 'Jubin Nautiyal', 'Neha Kakkar',
        'Tony Kakkar', 'Dhvani Bhanushali', 'Parmish Verma', 'Rahat Fateh Ali Khan',
        'Atif Aslam', 'Abhash Jha', 'Shankar Mahadevan', 'A.R. Rahman', 'Armaan Malik',
        'Sonu Nigam', 'Kumar Sanu', 'Alka Yagnik', 'Udit Narayan', 'Shreya Ghoshal',
        'Sukhwinder Singh', 'Nusrat Fateh Ali Khan', 'Gurdas Maan', 'Pranjal Dahiya'
      ];
      for (const a of artists) {
        if (new RegExp(`\\b${a.replace('.', '\\.')}\\b`, 'i').test(combined)) {
          cleanArtist = a;
          break;
        }
      }
    }

    if (!cleanArtist) {
      cleanArtist = 'Audio Vault';
    }

    // Generate unique ID from relative path
    const id = crypto.createHash('md5').update(relPath).digest('hex').slice(0, 12);

    const categories = detectCategories(`${cleanTitle} ${cleanArtist} ${filename}`);
    const { gradient, h1, h2 } = generateGradient(cleanTitle);

    // Encode path segments properly for URLs (e.g. songs/My%20Song.mp3)
    const url = relPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    songs.push({
      id,
      filename,
      filePath: relPath,
      url,
      title: cleanTitle,
      artist: cleanArtist,
      album: cleanString(id3.TALB) || 'Audio Vault',
      sizeBytes: stat.size,
      sizeFormatted: (stat.size / (1024 * 1024)).toFixed(1) + ' MB',
      extension: ext.replace('.', '').toUpperCase(),
      categories,
      gradient,
      colorHue: h1
    });
  }

  // Sort alphabetically by title by default
  songs.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  console.log(`Found ${songs.length} audio files in ${targetDir}.`);

  // Write songs.json in rootDir
  const jsonPath = path.join(rootDir, 'songs.json');
  fs.writeFileSync(jsonPath, JSON.stringify(songs, null, 2), 'utf8');
  console.log(`Wrote JSON catalog to ${jsonPath}`);

  // Write songs.js in rootDir for local file:/// execution without CORS
  const jsPath = path.join(rootDir, 'songs.js');
  const jsContent = `/**
 * Pre-generated audio catalog for local offline execution & GitHub Pages
 * Total Tracks: ${songs.length}
 * Generated: ${new Date().toISOString()}
 */
window.AUDIO_CATALOG = ${JSON.stringify(songs, null, 2)};
`;
  fs.writeFileSync(jsPath, jsContent, 'utf8');
  console.log(`Wrote JS catalog to ${jsPath}`);

  return songs;
}

// Run if called directly
if (require.main === module) {
  generateCatalog('.');
}

module.exports = { generateCatalog };
