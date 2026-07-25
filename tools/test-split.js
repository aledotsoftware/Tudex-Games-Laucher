const fs = require('fs');
const path = require('path');
const Seven = require('node-7z');
const { path7za } = require('7zip-bin');

const outputArchive = path.join(__dirname, '..', 'test_split_output.7z');
const sourceDir = path.join(__dirname, '..', 'test_versions_suite', 'v10');

console.log('Testing 7za volume creation with raw switch -v100k...');

const stream = Seven.add(outputArchive, `${sourceDir}/*`, {
    $bin: path7za,
    $progress: true,
    raw: ['-v5k']
});

stream.on('progress', (p) => {
    console.log(`Progress: ${p.percent}%`);
});

stream.on('end', () => {
    console.log('\nCompression ended. Checking output files:');
    const parentDir = path.dirname(outputArchive);
    const files = fs.readdirSync(parentDir).filter(f => f.includes('test_split_output'));
    console.log(files);
});

stream.on('error', (err) => {
    console.error('Error:', err);
});
