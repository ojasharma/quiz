import React, { useState, useEffect } from "react";
import { Groq } from "groq-sdk";

const QUIZ_TIME = 600; // 10 minutes in seconds

const App = () => {
  const [difficulty, setDifficulty] = useState("easy");
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Timer Effect
  useEffect(() => {
    let timer;
    if (quizStarted && !quizFinished && !reviewMode && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizFinished, reviewMode, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

 const generateQuiz = async () => {
   setIsLoading(true);
   try {
     const groq = new Groq({
       apiKey: import.meta.env.VITE_GROQ_API_KEY,
       dangerouslyAllowBrowser: true,
     });

     const prompt = `Return a JSON object containing Linux command quiz questions. Format:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct": number,
      "explanation": "string",
      "command_example": "string"
    }
  ]
}

Requirements:
- Generate 10 ${difficulty} multiple-choice questions about Linux commands
- Focus on: cat, chmod, cd, cp, date, echo, ftp, grep, head, ls, lpr, more, mkdir, mv, ncftp, print, pwd, rm, rmdir, rsh, setenv, sort, tail, tar, telnet, wc
- Make questions practical and scenario-based
- Include clear explanations and command examples
- Ensure response is ONLY the JSON object, no additional text or markdown
- correct should be a number between 0 and 3 representing the correct answer index
- Vary the correct answer indices - don't always use the same index
- Return valid, parseable JSON

Example of one question object:
{
  "question": "You need to find all files containing the word 'error' in a log directory. Which command should you use?",
  "options": [
    "ls -l /var/log/ | error",
    "find /var/log/ -name error",
    "cat /var/log/ | error",
    "grep -r 'error' /var/log/"
  ],
  "correct": 3,
  "explanation": "The grep command with -r (recursive) flag searches through all files in the specified directory and its subdirectories for the given pattern.",
  "command_example": "grep -r 'error' /var/log/"
}`;

     const response = await groq.chat.completions.create({
       messages: [
         {
           role: "system",
           content:
             "You are a JSON generator. Only output valid JSON objects without any additional text, markdown formatting, or explanation.",
         },
         {
           role: "user",
           content: prompt,
         },
       ],
       model: "llama-3.3-70b-versatile",
       temperature: 0.7,
       max_tokens: 2000,
     });

     let jsonString = response.choices[0].message.content.trim();

     // Remove any potential markdown code block indicators
     jsonString = jsonString
       .replace(/```json/g, "")
       .replace(/```/g, "")
       .trim();

     try {
       const quizData = JSON.parse(jsonString);
       if (
         quizData.questions &&
         Array.isArray(quizData.questions) &&
         quizData.questions.length === 10
       ) {
         setQuestions(quizData.questions);
         setQuizStarted(true);
         setTimeLeft(QUIZ_TIME);
       } else {
         throw new Error("Invalid quiz data format");
       }
     } catch (parseError) {
       console.error("JSON Parse Error:", parseError);
       console.log("Received content:", jsonString);
       throw new Error("Failed to parse quiz data");
     }
   } catch (error) {
     console.error("Error generating quiz:", error);
     alert("Error generating quiz. Please try again.");
   } finally {
     setIsLoading(false);
   }
 };

 const handleAnswer = (questionIndex, answerIndex) => {
   if (!quizFinished && !reviewMode) {
     setAnswers((prev) => ({
       ...prev,
       [questionIndex]: answerIndex,
     }));
   }
 };

  const finishQuiz = () => {
    let finalScore = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        finalScore++;
      }
    });
    setScore(finalScore);
    setQuizFinished(true);
    setShowAnswers(true);
  };

  const startReview = () => {
    setReviewMode(true);
    setCurrentQuestion(0);
    setShowAnswers(true);
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizFinished(false);
    setReviewMode(false);
    setAnswers({});
    setCurrentQuestion(0);
    setScore(0);
    setShowAnswers(false);
    setTimeLeft(QUIZ_TIME);
    setQuestions([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white font-satoshi relative pb-16">
      <div className="container mx-auto px-4 py-12 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-12 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Linux Commands Quiz
          </h1>

          {/* Start Screen */}
          {!quizStarted && (
            <div className="max-w-md mx-auto backdrop-blur-lg bg-gray-800/50 p-8 rounded-2xl shadow-xl border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Choose Your Challenge
              </h2>
              <div className="mb-8">
                <label className="block mb-3 text-lg">Select Difficulty:</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500/20 outline-none transition"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <button
                onClick={generateQuiz}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 p-4 rounded-lg font-medium text-lg transition transform hover:scale-105 active:scale-95"
              >
                Start Quiz
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center p-8 backdrop-blur-lg bg-gray-800/50 rounded-2xl">
              <img
                src="gif1.gif"
                alt="Loading..."
                className="mx-auto mb-6 rounded-lg"
                style={{ width: "100px", height: "auto", boxShadow: "none" }}
              />
              <p className="text-xl animate-pulse">Generating your quiz...</p>
            </div>
          )}

          {/* Quiz Questions */}
          {((quizStarted && !quizFinished && !isLoading) || reviewMode) &&
            questions.length > 0 && (
              <div className="backdrop-blur-lg bg-gray-800/50 p-8 rounded-2xl shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <span className="bg-gray-700 px-4 py-2 rounded-lg text-lg">
                      Question {currentQuestion + 1}/10
                    </span>
                    {reviewMode && (
                      <span className="bg-blue-600/50 px-4 py-2 rounded-lg text-lg">
                        Review Mode
                      </span>
                    )}
                  </div>
                  {!reviewMode && !quizFinished && (
                    <span className="bg-gray-700 px-4 py-2 rounded-lg text-xl font-medium text-blue-400">
                      {formatTime(timeLeft)}
                    </span>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-medium mb-6 leading-relaxed">
                    {questions[currentQuestion].question}
                  </h2>
                  <div className="space-y-4">
                    {questions[currentQuestion]?.options.map(
                      (option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswer(currentQuestion, index)}
                          disabled={reviewMode || quizFinished}
                          className={`w-full p-4 text-left rounded-lg transition transform relative ${
                            reviewMode || quizFinished
                              ? "cursor-default"
                              : "hover:translate-x-1"
                          } ${
                            answers[currentQuestion] === index
                              ? showAnswers
                                ? index === questions[currentQuestion].correct
                                  ? "bg-green-600/80 border-2 border-green-400"
                                  : "bg-red-600/80 border-2 border-red-400"
                                : "bg-blue-600/80 border-2 border-blue-400"
                              : showAnswers &&
                                index === questions[currentQuestion].correct
                              ? "bg-green-600/50 border-2 border-green-400"
                              : "bg-gray-700 border border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="inline-block w-8 h-8 text-center leading-8 bg-gray-800 rounded-full mr-3">
                                {String.fromCharCode(65 + index)}
                              </span>
                              {option}
                            </div>
                            {showAnswers &&
                              index === questions[currentQuestion].correct && (
                                <span className="text-green-400 font-medium">
                                  ✓ Correct Answer
                                </span>
                              )}
                          </div>
                        </button>
                      )
                    )}
                  </div>

                  {/* Explanation Section - Only shown in review mode or after answering */}
                  {(reviewMode || (showAnswers && quizFinished)) && (
                    <div className="mt-8 p-6 bg-gray-700/50 rounded-lg border border-gray-600">
                      <h3 className="text-xl font-semibold mb-4 text-blue-300">
                        Explanation
                      </h3>
                      <p className="text-gray-200 mb-4">
                        {questions[currentQuestion].explanation}
                      </p>
                      <div className="mt-4">
                        <h4 className="font-semibold text-blue-300 mb-2">
                          Example Usage:
                        </h4>
                        <code className="block p-3 bg-gray-800 rounded-lg font-mono text-sm">
                          {questions[currentQuestion].command_example}
                        </code>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={() =>
                      setCurrentQuestion((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentQuestion === 0}
                    className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ← Previous
                  </button>
                  <div className="text-center mx-4">
                    {reviewMode && (
                      <button
                        onClick={resetQuiz}
                        className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition"
                      >
                        New Quiz
                      </button>
                    )}
                  </div>
                  {currentQuestion === questions.length - 1 ? (
                    !reviewMode &&
                    !quizFinished && (
                      <button
                        onClick={finishQuiz}
                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition transform hover:scale-105"
                      >
                        Finish Quiz
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() =>
                        setCurrentQuestion((prev) =>
                          Math.min(questions.length - 1, prev + 1)
                        )
                      }
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition transform hover:scale-105"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Results Screen */}
          {quizFinished && !reviewMode && (
            <div className="max-w-md mx-auto text-center backdrop-blur-lg bg-gray-800/50 p-8 rounded-2xl shadow-xl border border-gray-700">
              <h2 className="text-3xl font-bold mb-6">Quiz Complete! 🎉</h2>
              <div className="mb-8">
                <p className="text-6xl font-bold text-blue-400 mb-2">
                  {score}/10
                </p>
                <p className="text-xl text-gray-300">Your Score</p>
                <p className="mt-4 text-lg">
                  {score === 10
                    ? "Perfect score! 🌟"
                    : score >= 8
                    ? "Excellent work! 🎉"
                    : score >= 6
                    ? "Good job! 👍"
                    : "Keep practicing! 💪"}
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={startReview}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-4 rounded-lg font-medium text-lg transition transform hover:scale-105"
                >
                  Review Answers
                </button>
                <button
                  onClick={resetQuiz}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 rounded-lg font-medium text-lg transition transform hover:scale-105"
                >
                  Take Another Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <footer className="fixed bottom-0 w-full backdrop-blur-md bg-gray-900/90 border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <a
              href="https://github.com/ojasharma"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
