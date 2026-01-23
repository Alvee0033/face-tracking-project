const axios = require('axios');
const { Groq } = require('groq-sdk');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Generate AI-powered search query for YouTube
   * @param {string} skillName - Name of the skill
   * @param {string} skillLevel - Skill level
   * @param {string} learningPath - Learning path from roadmap (optional)
   * @returns {string} Optimized search query
   */
  async generateSearchQuery(skillName, skillLevel, learningPath = '') {
    try {
      const prompt = `Generate an optimized YouTube search query to find the best tutorial videos for learning ${skillName} at ${skillLevel} level.
      
      Requirements:
      - Include the skill name and level
      - Add relevant keywords that people use when searching for tutorials
      - Include year (2024 or 2025) for recent content
      - Keep it concise (max 10 words)
      - Focus on tutorial, course, or learning keywords
      
      ${learningPath ? `Learning context: ${learningPath}` : ''}
      
      Return ONLY the search query, nothing else.`;

      const response = await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating optimized search queries. Return only the search query text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 50,
        temperature: 0.7,
        top_p: 1,
        stream: false
      });

      const query = response.choices[0].message.content.trim();
      console.log(`AI-generated search query for ${skillName}: ${query}`);
      return query;
    } catch (error) {
      console.error('AI query generation error:', error);
      // Fallback to simple query
      return `${skillName} ${skillLevel} tutorial course`;
    }
  }

  /**
   * Search YouTube for videos related to a skill
   * @param {string} skillName - Name of the skill
   * @param {string} skillLevel - Skill level (Beginner, Intermediate, Advanced, Expert)
   * @param {string} learningPath - Learning path from roadmap (optional)
   * @param {number} maxVideos - Maximum number of videos to return (1-5)
   * @returns {Array} Array of videos (1-5 videos)
   */
  async searchCourseForSkill(skillName, skillLevel, learningPath = '', maxVideos = 5) {
    try {
      // Generate AI-powered search query
      const query = await this.generateSearchQuery(skillName, skillLevel, learningPath);

      console.log(`Searching YouTube for: ${query}`);

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults: 10, // Get more to filter
          order: 'relevance',
          videoDuration: 'medium', // 4-20 minutes
          videoDefinition: 'high'
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No videos found');
      }

      // Get video details (duration, view count)
      const videoIds = response.data.items.map(item => item.id.videoId).join(',');
      const detailsResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoIds,
          part: 'snippet,contentDetails,statistics'
        }
      });

      // Map videos with details
      const videos = detailsResponse.data.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
        channelName: video.snippet.channelTitle,
        duration: this.parseDuration(video.contentDetails.duration),
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount || 0)
      }));

      // Filter by minimum views (>5000) and sort by views
      const filteredVideos = videos
        .filter(v => v.viewCount > 5000)
        .sort((a, b) => b.viewCount - a.viewCount);

      // Return 1-5 videos based on maxVideos parameter
      const videosToReturn = filteredVideos.length > 0
        ? filteredVideos.slice(0, Math.min(maxVideos, filteredVideos.length))
        : videos.sort((a, b) => b.viewCount - a.viewCount).slice(0, Math.min(maxVideos, videos.length));

      return videosToReturn;
    } catch (error) {
      console.error('YouTube search error:', error.response?.data || error.message);

      // Fallback: If quota exceeded or error, return mock videos relevant to the skill
      console.log('⚠️ YouTube API failed/quota exceeded. Using fallback mock videos.');
      return this.getMockVideos(skillName, skillLevel);
    }
  }

  /**
   * Generate mock videos for fallback when API fails
   */
  getMockVideos(skillName, skillLevel) {
    const images = [
      'https://i.ytimg.com/vi/PkZNo7MFNFg/hqdefault.jpg',
      'https://i.ytimg.com/vi/W6NZfCO5SIk/hqdefault.jpg',
      'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg',
      'https://i.ytimg.com/vi/SqcY0GlETPk/hqdefault.jpg'
    ];

    return [
      {
        videoId: 'PkZNo7MFNFg',
        title: `Learn ${skillName} in 2024 - Full Course for Beginners`,
        description: `Complete ${skillName} tutorial for ${skillLevel} level students. Master the core concepts and build real projects.`,
        thumbnailUrl: images[Math.floor(Math.random() * images.length)],
        channelName: 'Tech Education Channel',
        duration: '2:30:15',
        publishedAt: new Date().toISOString(),
        viewCount: 150000
      },
      {
        videoId: 'W6NZfCO5SIk',
        title: `Advanced ${skillName} Concepts Explained`,
        description: `Deep dive into ${skillName} for ${skillLevel} developers. Best practices and design patterns.`,
        thumbnailUrl: images[Math.floor(Math.random() * images.length)],
        channelName: 'Coding Mastery',
        duration: '45:20',
        publishedAt: new Date().toISOString(),
        viewCount: 85000
      },
      {
        videoId: 'bMknfKXIFA8',
        title: `${skillName} Crash Course - Build a Project`,
        description: `Hands-on practice with ${skillName}. Build a portfolio project from scratch.`,
        thumbnailUrl: images[Math.floor(Math.random() * images.length)],
        channelName: 'Dev Skills',
        duration: '1:15:00',
        publishedAt: new Date().toISOString(),
        viewCount: 62000
      }
    ];
  }

  /**
   * Parse ISO 8601 duration to readable format
   * @param {string} duration - ISO 8601 duration (e.g., PT1H2M10S)
   * @returns {string} Human-readable duration (e.g., "1:02:10")
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

module.exports = new YouTubeService();

