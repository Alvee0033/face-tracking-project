import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CoursesService {
    constructor(private config: ConfigService) { }

    /**
     * Searches YouTube for tutorial videos related to a query.
     * @param query The search query
     * @param maxResults The maximum number of results to return
     * @returns A list of video objects
     */
    async searchYouTube(query: string, maxResults = 10): Promise<any[]> {
        const apiKey = this.config.get('YOUTUBE_API_KEY');
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query + ' tutorial course')}&maxResults=${maxResults}&key=${apiKey}`;
        try {
            const res = await axios.get(url);
            return res.data.items.map((item: any) => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            }));
        } catch (e) {
            return [];
        }
    }

    /**
     * Gets course recommendations based on user skills.
     * @param skills Array of user skills
     * @returns A list of recommended video objects
     */
    async getRecommendations(skills: string[]): Promise<any[]> {
        const skill = skills[0] || 'programming';
        return this.searchYouTube(skill, 5);
    }
}
