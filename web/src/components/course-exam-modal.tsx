"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { aiAnalysisAPI } from "@/lib/api"

interface Question {
    id: number
    question: string
    options: string[]
    correctAnswer: number
}

interface CourseExamModalProps {
    isOpen: boolean
    onClose: () => void
    onPass: () => void
    topic: string
    courseId: string
}

export function CourseExamModal({ isOpen, onClose, onPass, topic, courseId }: CourseExamModalProps) {
    const [loading, setLoading] = useState(false)
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [submitted, setSubmitted] = useState(false)
    const [score, setScore] = useState(0)
    const [passed, setPassed] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load questions when modal opens
    useEffect(() => {
        if (isOpen) {
            loadQuestions()
        }
    }, [isOpen])

    async function loadQuestions() {
        try {
            setLoading(true)
            setError(null)

            // Check cache first
            const cached = localStorage.getItem(`exam_${courseId}`)
            if (cached) {
                setQuestions(JSON.parse(cached))
                setLoading(false)
                return
            }

            const response = await aiAnalysisAPI.generateCourseExam({ topic })
            const generatedQuestions = response.data.data

            setQuestions(generatedQuestions)
            localStorage.setItem(`exam_${courseId}`, JSON.stringify(generatedQuestions))
        } catch (err) {
            console.error(err)
            setError("Failed to generate exam questions. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = () => {
        if (Object.keys(answers).length < questions.length) {
            setError("Please answer all questions before submitting.")
            return
        }

        let correctCount = 0
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                correctCount++
            }
        })

        const finalScore = (correctCount / questions.length) * 10
        setScore(finalScore)
        setSubmitted(true)

        // Pass if score >= 7 (70%)
        if (finalScore >= 7) {
            setPassed(true)
            // Save result to cache
            localStorage.setItem(`exam_result_${courseId}`, 'passed')
            setTimeout(() => {
                onPass()
            }, 2000)
        } else {
            setPassed(false)
        }
    }

    const handleRetry = () => {
        setAnswers({})
        setSubmitted(false)
        setScore(0)
        setPassed(false)
        setError(null)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Knowledge Check: {topic}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Answer 5 questions to unlock the next course. Passing score: 7/10.
                    </p>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 text-[#14b8a6] animate-spin mb-4" />
                            <p className="text-gray-500">Generating AI questions for you...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <p className="text-gray-900 font-medium mb-2">{error}</p>
                            <Button onClick={loadQuestions} variant="outline" className="mt-2">Try Again</Button>
                        </div>
                    ) : !submitted ? (
                        <div className="space-y-6">
                            {questions.map((q, index) => (
                                <div key={q.id} className="p-4 border border-gray-200 rounded-lg hover:border-[#14b8a6] transition-colors">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                                        {index + 1}. {q.question}
                                    </h4>
                                    <div className="space-y-2">
                                        {q.options.map((opt, optIndex) => (
                                            <label
                                                key={optIndex}
                                                className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all ${answers[q.id] === optIndex
                                                    ? "bg-teal-50 border border-teal-200"
                                                    : "hover:bg-gray-50 border border-transparent"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    className="h-4 w-4 text-[#14b8a6] focus:ring-[#14b8a6]"
                                                    checked={answers[q.id] === optIndex}
                                                    onChange={() => {
                                                        setAnswers(prev => ({ ...prev, [q.id]: optIndex }))
                                                        setError(null)
                                                    }}
                                                />
                                                <span className="text-sm text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                            {passed ? (
                                <div className="animate-in zoom-in duration-300">
                                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="h-12 w-12 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-green-600 mb-2">Excellent!</h3>
                                    <p className="text-gray-600">You passed with a score of {score}/10.</p>
                                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-800 font-medium">Unlocking next module...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in zoom-in duration-300">
                                    <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <XCircle className="h-12 w-12 text-red-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-red-600 mb-2">Keep Learning</h3>
                                    <p className="text-gray-600">You scored {score}/10. You need 7/10 to pass.</p>
                                    <Button onClick={handleRetry} className="mt-6 bg-[#14b8a6] hover:bg-teal-700 w-full max-w-xs">
                                        Retake Exam
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && !loading && (
                        <p className="text-red-500 text-center mt-4 text-sm font-medium flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer - Always visible */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={submitted && passed}>
                        Close
                    </Button>
                    {!submitted && !loading && !error && (
                        <Button
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white min-w-[120px] shadow-md hover:shadow-lg hover:shadow-teal-500/30 transition-all"
                        >
                            Submit Answers
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
