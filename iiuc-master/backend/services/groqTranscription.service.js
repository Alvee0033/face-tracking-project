const Groq = require('groq-sdk');
const FormData = require('form-data');
const fs = require('fs');

class GroqTranscriptionService {
    constructor() {
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    /**
     * Transcribe audio file using Groq Whisper API
     * @param {Buffer|string} audioInput - Audio buffer or file path
     * @param {string} filename - Original filename (e.g., 'audio.m4a')
     * @returns {Promise<string>} - Transcribed text
     */
    async transcribeAudio(audioInput, filename) {
        try {
            console.log('🎤 Starting Groq Whisper transcription...');
            console.log('Filename:', filename);

            // Determine if input is a buffer or file path
            let fileStream;
            if (Buffer.isBuffer(audioInput)) {
                // Create a temporary file from buffer
                const tempPath = `/tmp/${Date.now()}_${filename}`;
                fs.writeFileSync(tempPath, audioInput);
                fileStream = fs.createReadStream(tempPath);
            } else if (typeof audioInput === 'string') {
                // Input is a file path
                fileStream = fs.createReadStream(audioInput);
            } else {
                throw new Error('Invalid audio input type. Must be Buffer or file path string.');
            }

            // Call Groq Whisper API
            const transcription = await this.client.audio.transcriptions.create({
                file: fileStream,
                model: 'whisper-large-v3-turbo',
                temperature: 0,
                response_format: 'verbose_json',
                language: 'en' // Can be made dynamic based on user preference
            });

            console.log('✅ Transcription completed');
            console.log('Transcribed text:', transcription.text);

            // Clean up temp file if created
            if (Buffer.isBuffer(audioInput)) {
                const tempPath = `/tmp/${Date.now()}_${filename}`;
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }

            return transcription.text;
        } catch (error) {
            console.error('❌ Groq transcription error:', error);
            throw new Error(`Transcription failed: ${error.message}`);
        }
    }

    /**
     * Transcribe audio with detailed metadata
     * @param {Buffer|string} audioInput - Audio buffer or file path
     * @param {string} filename - Original filename
     * @returns {Promise<Object>} - Detailed transcription object
     */
    async transcribeAudioDetailed(audioInput, filename) {
        try {
            console.log('🎤 Starting detailed Groq Whisper transcription...');

            let fileStream;
            if (Buffer.isBuffer(audioInput)) {
                const tempPath = `/tmp/${Date.now()}_${filename}`;
                fs.writeFileSync(tempPath, audioInput);
                fileStream = fs.createReadStream(tempPath);
            } else {
                fileStream = fs.createReadStream(audioInput);
            }

            const transcription = await this.client.audio.transcriptions.create({
                file: fileStream,
                model: 'whisper-large-v3-turbo',
                temperature: 0,
                response_format: 'verbose_json',
                language: 'en'
            });

            console.log('✅ Detailed transcription completed');

            // Clean up temp file if created
            if (Buffer.isBuffer(audioInput)) {
                const tempPath = `/tmp/${Date.now()}_${filename}`;
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }

            return {
                text: transcription.text,
                duration: transcription.duration,
                language: transcription.language,
                segments: transcription.segments || [],
                words: transcription.words || []
            };
        } catch (error) {
            console.error('❌ Detailed transcription error:', error);
            throw new Error(`Detailed transcription failed: ${error.message}`);
        }
    }

    /**
     * Validate audio file format
     * @param {string} filename - Filename to validate
     * @returns {boolean} - True if valid format
     */
    isValidAudioFormat(filename) {
        const validExtensions = ['.m4a', '.mp3', '.wav', '.webm', '.ogg', '.flac'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return validExtensions.includes(extension);
    }
}

module.exports = new GroqTranscriptionService();
