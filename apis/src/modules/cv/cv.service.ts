import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class CvService {
  private groq: Groq;

  constructor(private config: ConfigService) {
    this.groq = new Groq({ apiKey: config.get('GROQ_API_KEY') });
  }

  async parseResume(text: string) {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.2-3b-preview',
      messages: [{
        role: 'user',
        content: `Parse this resume text and extract structured data.
Resume: ${text.substring(0, 3000)}
Return strictly valid JSON: { "fullName": "", "email": "", "phone": "", "summary": "", "skills": [{"name": "", "level": ""}], "experience": [{"title": "", "company": "", "description": "", "startDate": "", "endDate": ""}], "education": [{"degree": "", "institution": "", "fieldOfStudy": "", "startDate": "", "endDate": ""}] }`,
      }],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async generateSummary(profileData: any) {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.2-3b-preview',
      messages: [{
        role: 'user',
        content: `Write a compelling professional summary for this candidate:
${JSON.stringify(profileData, null, 2).substring(0, 2000)}
Return a 3-4 sentence professional summary in plain text.`,
      }],
    });
    return { summary: response.choices[0].message.content };
  }

  async enhanceBullets(data: { bullets: string[] }) {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.2-3b-preview',
      messages: [{
        role: 'user',
        content: `Refine these professional resume bullet points to be more impactful, adding action verbs and emphasizing results.
        Bullets: ${data.bullets.join('\n')}
        Return strictly valid JSON with: { "enhancedBullets": ["..."] }`,
      }],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async generateRecommendations(data: { skills: string[]; roles: string[] }) {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.2-3b-preview',
      messages: [{
        role: 'user',
        content: `Based on these skills (${data.skills.join(', ')}) and preferred roles (${data.roles.join(', ')}), suggest 3 high-demand technical skills to learn and 3 target industries.
        Return strictly valid JSON: { "suggestedSkills": ["..."], "targetIndustries": ["..."], "advice": "..." }`,
      }],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  }
}
