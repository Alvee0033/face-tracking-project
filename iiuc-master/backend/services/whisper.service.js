const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Whisper Service for Audio Transcription
 */
class WhisperService {

    /**
     * Transcribe audio file using Groq Whisper API
     * @param {Buffer} audioBuffer - Audio file buffer
     * @param {string} originalName - Original filename for extension detection
     * @returns {Promise<Object>} Transcription result with text and metadata
     */
    static async transcribeAudio(audioBuffer, originalName = 'audio.webm') {
        let tempFilePath = null;

        try {
            // Create temp directory if it doesn't exist
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Generate unique temp filename
            const timestamp = Date.now();
            const extension = path.extname(originalName) || '.webm';
            const tempFileName = `audio_${timestamp}${extension}`;
            tempFilePath = path.join(tempDir, tempFileName);

            // Write buffer to temp file
            fs.writeFileSync(tempFilePath, audioBuffer);

            console.log(`[Whisper] Transcribing audio file: ${tempFileName}`);

            // Call Groq Whisper API
            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: 'whisper-large-v3-turbo',
                temperature: 0,
                response_format: 'verbose_json',
                language: 'en', // Can be made dynamic
            });

            console.log(`[Whisper] Transcription successful: ${transcription.text?.substring(0, 50)}...`);

            return {
                text: transcription.text,
                duration: transcription.duration,
                language: transcription.language,
                segments: transcription.segments || [],
            };

        } catch (error) {
            console.error('[Whisper] Transcription error:', error);
            throw new Error(`Failed to transcribe audio: ${error.message}`);
        } finally {
            // Clean up temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log(`[Whisper] Cleaned up temp file: ${tempFilePath}`);
                } catch (cleanupError) {
                    console.warn(`[Whisper] Failed to cleanup temp file: ${cleanupError.message}`);
                }
            }
        }
    }

    /**
     * Transcribe audio from base64 string
     * @param {string} base64Audio - Base64 encoded audio
     * @param {string} mimeType - MIME type (e.g., 'audio/webm')
     * @returns {Promise<Object>} Transcription result
     */
    static async transcribeBase64(base64Audio, mimeType = 'audio/webm') {
        try {
            // Convert base64 to buffer
            const audioBuffer = Buffer.from(base64Audio, 'base64');

            // Determine file extension from MIME type
            const extension = mimeType.split('/')[1] || 'webm';
            const filename = `audio.${extension}`;

            return await this.transcribeAudio(audioBuffer, filename);
        } catch (error) {
            console.error('[Whisper] Base64 transcription error:', error);
            throw new Error(`Failed to transcribe base64 audio: ${error.message}`);
        }
    }

    /**
     * Clean up old temp files (run periodically)
     */
    static cleanupTempFiles() {
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) return;

            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            const maxAge = 60 * 60 * 1000; // 1 hour

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;

                if (age > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`[Whisper] Cleaned up old temp file: ${file}`);
                }
            });
        } catch (error) {
            console.warn('[Whisper] Cleanup error:', error.message);
        }
    }
}

// Run cleanup every hour
setInterval(() => {
    WhisperService.cleanupTempFiles();
}, 60 * 60 * 1000);

module.exports = WhisperService;
