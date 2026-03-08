'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function CreateInterviewTemplate() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        topic: '',
        duration_minutes: 30,
        questionCount: 10
    });

    const [questions, setQuestions] = useState<any[]>([]);
    const [generatingQuestions, setGeneratingQuestions] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                question_text: '',
                question_type: 'general',
                expected_duration_seconds: 120,
                order_index: questions.length
            }
        ]);
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const generateAIQuestions = async () => {
        if (!formData.topic) {
            alert('Please enter a topic for AI question generation');
            return;
        }

        setGeneratingQuestions(true);
        try {
            const token = localStorage.getItem('token');

            // First create the template
            const templateResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/templates`,
                {
                    title: formData.title,
                    description: formData.description,
                    topic: formData.topic,
                    is_ai_generated: true,
                    duration_minutes: formData.duration_minutes
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const templateId = templateResponse.data.template.id;

            // Generate questions
            const questionsResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/templates/${templateId}/generate-questions`,
                {
                    questionCount: formData.questionCount
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert('Interview template created with AI-generated questions!');
            router.push('/recruiter/interviews/templates');
        } catch (error: any) {
            console.error('Generate questions error:', error);
            alert(error.response?.data?.message || 'Failed to generate questions');
        } finally {
            setGeneratingQuestions(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'ai') {
            await generateAIQuestions();
            return;
        }

        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/templates`,
                {
                    ...formData,
                    is_ai_generated: false,
                    questions
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert('Interview template created successfully!');
            router.push('/recruiter/interviews/templates');
        } catch (error: any) {
            console.error('Create template error:', error);
            alert(error.response?.data?.message || 'Failed to create template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Create Interview Template</h1>
                    <p className="text-gray-400">Design custom interview questions or let AI generate them for you</p>
                </div>

                {/* Mode Selection */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode('manual')}
                            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${mode === 'manual'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            ✍️ Manual Questions
                        </button>
                        <button
                            onClick={() => setMode('ai')}
                            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${mode === 'ai'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/50'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            🤖 AI Generated
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Interview Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Senior React Developer Interview"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description of the interview..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Topic *
                                </label>
                                <input
                                    type="text"
                                    name="topic"
                                    value={formData.topic}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., React, Node.js, Data Science, Product Management"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Duration (minutes)
                                </label>
                                <input
                                    type="number"
                                    name="duration_minutes"
                                    value={formData.duration_minutes}
                                    onChange={handleInputChange}
                                    min="10"
                                    max="120"
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Questions Section */}
                    {mode === 'manual' ? (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-white">Questions</h2>
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    + Add Question
                                </button>
                            </div>

                            <div className="space-y-4">
                                {questions.map((q, index) => (
                                    <div key={index} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-sm font-medium text-gray-400">Question {index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(index)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <textarea
                                                value={q.question_text}
                                                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                                                placeholder="Enter your question..."
                                                rows={2}
                                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />

                                            <div className="grid grid-cols-2 gap-3">
                                                <select
                                                    value={q.question_type}
                                                    onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                                                    className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="general">General</option>
                                                    <option value="technical">Technical</option>
                                                    <option value="behavioral">Behavioral</option>
                                                    <option value="situational">Situational</option>
                                                </select>

                                                <input
                                                    type="number"
                                                    value={q.expected_duration_seconds}
                                                    onChange={(e) => updateQuestion(index, 'expected_duration_seconds', parseInt(e.target.value))}
                                                    placeholder="Duration (seconds)"
                                                    className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {questions.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <p>No questions added yet. Click "Add Question" to get started.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-4">AI Question Generation</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Number of Questions
                                </label>
                                <input
                                    type="number"
                                    name="questionCount"
                                    value={formData.questionCount}
                                    onChange={handleInputChange}
                                    min="5"
                                    max="30"
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-2 text-sm text-gray-400">
                                    AI will generate a mix of technical, behavioral, and situational questions based on your topic.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-4 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || generatingQuestions}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading || generatingQuestions ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {mode === 'ai' ? 'Generating Questions...' : 'Creating...'}
                                </span>
                            ) : (
                                mode === 'ai' ? '🤖 Generate & Create' : '✅ Create Template'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
