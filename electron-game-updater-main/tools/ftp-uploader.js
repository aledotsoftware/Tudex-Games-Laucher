/**
 * FTP / SFTP Uploader helper using basic-ftp
 */
async function uploadPublicHtml(ftpConfig, publicHtmlDir, logCallback = console.log) {
    let ftp;
    try {
        const ftpModule = require('basic-ftp');
        ftp = new ftpModule.Client();
        ftp.ftp.verbose = false;

        logCallback(`Connecting to FTP server: ${ftpConfig.host}:${ftpConfig.port || 21}...`);
        
        await ftp.access({
            host: ftpConfig.host,
            port: parseInt(ftpConfig.port || 21, 10),
            user: ftpConfig.user,
            password: ftpConfig.password,
            secure: ftpConfig.secure || false
        });

        logCallback("✅ Connected to FTP server successfully.");
        
        const remoteRoot = ftpConfig.remoteDir || "/public_html";
        logCallback(`Ensuring remote directory exists: ${remoteRoot}...`);
        await ftp.ensureDir(remoteRoot);

        logCallback(`Uploading contents of ${publicHtmlDir} to ${remoteRoot}...`);
        await ftp.uploadFromDir(publicHtmlDir, remoteRoot);

        logCallback("🎉 ¡Publicación en Servidor FTP completada con éxito!");
        ftp.close();
        return true;
    } catch (err) {
        logCallback(`❌ Error en subida FTP: ${err.message}`);
        if (ftp) ftp.close();
        throw err;
    }
}

module.exports = {
    uploadPublicHtml
};
