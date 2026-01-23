import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { CareerBotMessage, UserContext } from '../types';
import { fetchUserContext } from '../utils/careerBotUtils';

interface CareerBotProps {
  onClose: () => void;
  userId?: string; // Optional: pass user ID if authenticated
}

export const CareerBot: React.FC<CareerBotProps> = ({ onClose, userId }) => {
  const [messages, setMessages] = useState<CareerBotMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm CareerBot, your AI-powered career mentor. 🚀

I'm here to help you with:
• Finding roles that match your skills
• Identifying learning paths for your career goals
• Improving your chances of landing internships or jobs
• Exploring opportunities aligned with SDG 8 (Decent Work & Economic Growth)

How can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user context on mount if userId is provided
  useEffect(() => {
    if (userId) {
      loadUserContext();
    }
  }, [userId]);

  const loadUserContext = async () => {
    try {
      const context = await fetchUserContext(userId!);
      setUserContext(context);
    } catch (error) {
      console.error('Failed to load user context:', error);
    }
  };

  const buildSystemPrompt = (): string => {
    let prompt = `You are CareerBot, an empathetic and knowledgeable AI career mentor specializing in youth employment and SDG 8 (Decent Work and Economic Growth). Your mission is to guide job seekers, students, and young professionals toward meaningful career paths.

Key responsibilities:
1. Provide personalized career advice based on user's profile, skills, and goals
2. Suggest relevant job roles and learning paths
3. Offer practical tips for internships, job applications, and career development
4. Align recommendations with SDG 8 principles: decent work, economic growth, and equal opportunities
5. Be supportive, encouraging, and realistic

Important guidelines:
- Always clarify that you're providing suggestions, not guarantees
- Be culturally sensitive and inclusive
- Focus on actionable advice
- Encourage continuous learning and skill development
- Highlight opportunities for youth and underrepresented groups
- When discussing jobs, emphasize quality employment and fair labor practices

`;

    if (userContext) {
      prompt += `\nUser Context:\n`;
      
      if (userContext.profile) {
        prompt += `\nProfile Information:
- Name: ${userContext.profile.full_name || 'Not provided'}
- Role: ${userContext.profile.headline || 'Not provided'}
- Experience: ${userContext.profile.years_of_experience || 'Not provided'}
- Current Position: ${userContext.profile.current_job_title || 'Not specified'} ${userContext.profile.current_company ? `at ${userContext.profile.current_company}` : ''}
- Location: ${userContext.profile.city}, ${userContext.profile.country}
- Bio: ${userContext.profile.bio || 'Not provided'}
`;
      }

      if (userContext.skills && userContext.skills.length > 0) {
        prompt += `\nVerified Skills:\n${userContext.skills.map(s => `- ${s.skill_name} (${s.skill_level})`).join('\n')}
`;
      }

      if (userContext.experience && userContext.experience.length > 0) {
        prompt += `\nWork Experience:\n${userContext.experience.map(exp => 
          `- ${exp.job_title} at ${exp.company} (${exp.experience_type}${exp.is_current ? ', Current' : ''})`
        ).join('\n')}
`;
      }

      if (userContext.education && userContext.education.length > 0) {
        prompt += `\nEducation:\n${userContext.education.map(edu => 
          `- ${edu.degree} in ${edu.field_of_study} from ${edu.institution}${edu.is_current ? ' (Current)' : ''}`
        ).join('\n')}
`;
      }

      if (userContext.jobPreferences) {
        const prefs = userContext.jobPreferences;
        prompt += `\nJob Preferences:
- Looking for: ${prefs.looking_for?.join(', ') || 'Not specified'}
- Preferred roles: ${prefs.preferred_roles?.join(', ') || 'Not specified'}
- Expected salary: ${prefs.expected_salary_min && prefs.expected_salary_max ? `${prefs.salary_currency} ${prefs.expected_salary_min} - ${prefs.expected_salary_max}` : 'Not specified'}
`;
      }

      if (userContext.availableJobs && userContext.availableJobs.length > 0) {
        prompt += `\nSample Available Jobs (for reference):\n${userContext.availableJobs.slice(0, 5).map(job => 
          `- ${job.job_title} (${job.experience_level}, ${job.work_mode}) at ${job.company_name || job.recruiter_id} in ${job.city}, ${job.country}`
        ).join('\n')}
`;
      }
    }

    return prompt;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: CareerBotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!import.meta.env.VITE_API_KEY) {
        throw new Error('API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      const model = ai.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        systemInstruction: buildSystemPrompt(),
      });

      // Build conversation history for context
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(userMessage.content);
      const response = await result.response;
      const botResponse = response.text();

      const assistantMessage: CareerBotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('CareerBot error:', error);
      
      const errorMessage: CareerBotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your question.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "Which roles fit my skills?",
    "What should I learn to become a backend developer?",
    "How can I improve my chances of getting an internship?",
    "What are the best entry-level jobs for me?",
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
      <div className="w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">CareerBot</h2>
              <p className="text-blue-100 text-xs">Your AI Career Mentor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close CareerBot"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 bg-white border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your career..."
              className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-5 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 CareerBot provides suggestions, not guarantees. Always verify information.
          </p>
        </div>
      </div>
    </div>
  );
};
