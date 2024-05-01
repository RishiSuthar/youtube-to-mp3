const express = require('express');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!ytdl.validateURL(url)) {
            throw new Error('Invalid YouTube URL');
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${title}.wav"`);

        const audioStream = ytdl(url, { filter: 'audioonly' });
        const ffmpegProcess = spawn(ffmpeg, [
            '-i', 'pipe:0',          // Input from stdin
            '-f', 'wav',             // Output format
            'pipe:1'                 // Output to stdout
        ]);

        audioStream.pipe(ffmpegProcess.stdin);
        ffmpegProcess.stdout.pipe(res);

        ffmpegProcess.stderr.on('data', data => {
            console.error(`ffmpeg stderr: ${data}`);
        });

        ffmpegProcess.on('close', code => {
            if (code !== 0) {
                console.error(`ffmpeg process exited with code ${code}`);
            }
            res.end();
        });
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
