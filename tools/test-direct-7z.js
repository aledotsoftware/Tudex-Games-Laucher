const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { path7za } = require('7zip-bin');

const outputArchive = path.join(__dirname, '..', 'test_direct_output.7z');
const sourceDir = path.join(__dirname, '..', 'test_versions_suite', 'v10');

if (fs.existsSync(outputArchive)) fs.unlinkSync(outputArchive);

console.log('Testing direct 7za execFile with -v5k switch...');

const args = ['a', outputArchive, `${sourceDir}/*`, '-v5k', '-mx=5'];

execFile(path7za, args, (error, stdout, stderr) => {
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('7za stdout:', stdout);
    const parentDir = path.dirname(outputArchive);
    const files = fs.readdirSync(parentDir).filter(f => f.includes('test_direct_output'));
    console.log('\nGenerated files in parent dir:');
    console.log(files);
});
