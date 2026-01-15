"use client"

import { useState } from "react"
import { X, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Question {
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
}

interface ExamResult {
  passed: boolean
  score: number
  totalMarks: number
  percentage: number
  results: Array<{
    questionIndex: number
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }>
}

interface SkillExamProps {
  exam: {
    id: string
    questions: Question[]
    totalMarks: number
    passingMarks: number
    skillName: string
    skillLevel: string
  }
  onClose: () => void
  onSubmit: (examId: string, answers: Array<{ questionIndex: number; answer: string }>) => Promise<ExamResult>
}

export function SkillExam({ exam, onClose, onSubmit }: SkillExamProps) {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ExamResult | null>(null)

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }))
  }

  const handleSubmit = async () => {
    if (!allAnswered) return

    setSubmitting(true)

    try {
      // INSTANT CLIENT-SIDE EVALUATION (blazing fast!)
      const evaluatedResults = exam.questions.map((question: any, index) => {
        const userAnswer = answers[index]
        const correctAnswer = question.correctAnswer
        const isCorrect = userAnswer === correctAnswer

        return {
          questionIndex: index,
          question: question.question,
          userAnswer,
          correctAnswer,
          isCorrect,
          explanation: question.explanation || ''
        }
      })

      const score = evaluatedResults.filter(r => r.isCorrect).length
      const totalMarks = exam.questions.length
      const percentage = Math.round((score / totalMarks) * 100)
      const passed = score >= exam.passingMarks

      // Show results INSTANTLY (no waiting for backend!)
      const instantResult = {
        passed,
        score,
        totalMarks,
        percentage,
        results: evaluatedResults,
        message: passed
          ? 'Congratulations! Skill verified successfully.'
          : 'You did not pass the exam. Please try again.'
      }

      setResult(instantResult)
      setSubmitting(false)

      // Save to backend in background (non-blocking)
      const answersArray = exam.questions.map((_, index) => ({
        questionIndex: index,
        answer: answers[index] || ""
      }))

      // Fire and forget - don't wait for response
      onSubmit(exam.id, answersArray).catch(err => {
        console.error('Background save failed:', err)
        // Results already shown, so this is non-critical
      })

    } catch (error: any) {
      console.error("Failed to evaluate exam:", error)
      setSubmitting(false)
      alert("Failed to evaluate exam. Please try again.")
    }
  }

  const allAnswered = Object.keys(answers).length === exam.questions.length

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl shadow-lg border">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Exam Results</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className={`p-6 rounded-lg ${result.passed ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
              <div className="flex items-center gap-3 mb-4">
                {result.passed ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${result.passed ? 'text-green-900' : 'text-red-900'}`}>
                    {result.passed ? "Congratulations! You Passed!" : "You Did Not Pass"}
                  </h3>
                  <p className={`text-sm ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                    Score: {result.score}/{result.totalMarks} ({result.percentage}%)
                  </p>
                </div>
              </div>
              {result.passed ? (
                <p className="text-green-800">
                  Your skill has been verified and added to your profile!
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-800">
                    You need at least {exam.passingMarks} out of {exam.totalMarks} to pass. Please try again.
                  </p>
                  <Button onClick={() => { setResult(null); setAnswers({}) }} className="mt-4">
                    Retry Exam
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Question Review</h3>
              {result.results.map((item, index) => (
                <div key={index} className={`p-4 rounded-lg border ${item.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {item.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{item.question}</p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Your answer:</span>{" "}
                          <span className={item.isCorrect ? "text-green-700" : "text-red-700"}>
                            {item.userAnswer}
                          </span>
                        </p>
                        {!item.isCorrect && (
                          <p>
                            <span className="font-medium">Correct answer:</span>{" "}
                            <span className="text-green-700">{item.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {result.passed && (
              <Button onClick={onClose} className="w-full" size="lg">
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl shadow-lg border">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Skill Verification Exam</h2>
              <p className="text-sm text-gray-600 mt-1">
                {exam.skillName} - {exam.skillLevel} Level
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Answer all {exam.questions.length} questions</li>
                  <li>You need at least {exam.passingMarks} out of {exam.totalMarks} to pass</li>
                  <li>Each question has only one correct answer</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {exam.questions.map((question, index) => (
              <div key={index} className="p-4 rounded-lg border bg-white">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-1">
                      {index + 1}
                    </Badge>
                    <p className="font-medium flex-1">{question.question}</p>
                  </div>
                  <div className="space-y-2 ml-8">
                    {Object.entries(question.options).map(([key, value]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${answers[index] === key
                          ? "border-[#633ff3] bg-[#633ff3]/5"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={key}
                          checked={answers[index] === key}
                          onChange={() => handleAnswerChange(index, key)}
                          className="w-4 h-4 text-[#633ff3]"
                        />
                        <span className="font-medium text-gray-700 mr-2">{key}.</span>
                        <span className="text-gray-700">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Answered: {Object.keys(answers).length} / {exam.questions.length}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                size="lg"
                className={`
                  px-8 font-semibold text-base
                  bg-gradient-to-r from-[#633ff3] to-[#5330d4] 
                  hover:from-[#5330d4] hover:to-[#4528c2]
                  text-white shadow-lg
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${allAnswered && !submitting ? 'animate-pulse' : ''}
                `}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    Submit Exam
                    {allAnswered && <span className="ml-2">✓</span>}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

