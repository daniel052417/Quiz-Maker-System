import defaultQuestions from '../data/questions.json';
import React, { useState, useEffect } from 'react';

interface Question {
  question: string;
  answer: string | string[];
  category: string;
}

interface QuizConfig {
  timerEnabled: boolean;
  timerSeconds: number;
  hintsEnabled: boolean;
  selectedCategories: string[];
}

interface AnswerRecord {
  question: string;
  userAnswer: string;
  correctAnswer: string | string[];
  isCorrect: boolean;
  skipped: boolean;
  category: string;
}

const Quiz: React.FC = () => {
  const [screen, setScreen] = useState<'config' | 'quiz' | 'results' | 'manage'>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>(defaultQuestions);
  const [config, setConfig] = useState<QuizConfig>({
    timerEnabled: false,
    timerSeconds: 30,
    hintsEnabled: false,
    selectedCategories: []
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>([]);
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  // Get unique categories
  const getCategories = () => {
    const categories = new Set(allQuestions.map(q => q.category));
    return Array.from(categories).sort();
  };

  // Timer logic
  useEffect(() => {
    if (screen === 'quiz' && config.timerEnabled && feedback === null && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && config.timerEnabled && feedback === null && screen === 'quiz') {
      handleTimeout();
    }
  }, [timeLeft, screen, feedback, config.timerEnabled]);

  const startQuiz = () => {
    // Filter questions by selected categories
    let filteredQuestions = allQuestions;
    if (config.selectedCategories.length > 0) {
      filteredQuestions = allQuestions.filter(q => 
        config.selectedCategories.includes(q.category)
      );
    }

    if (filteredQuestions.length === 0) {
      alert('Please select at least one category!');
      return;
    }

    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setAnsweredQuestions(new Array(shuffled.length).fill(false));
    setAnswerRecords([]);
    setSkippedQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer('');
    setFeedback(null);
    setShowHint(false);
    setTimeLeft(config.timerEnabled ? config.timerSeconds : 0);
    setScreen('quiz');
    
    const stored = sessionStorage.getItem('quizScore');
    if (stored) {
      setLastScore(parseInt(stored, 10));
    }
  };

  const toggleCategory = (category: string) => {
    setConfig(prev => {
      const selected = prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category];
      return { ...prev, selectedCategories: selected };
    });
  };

  const selectAllCategories = () => {
    setConfig(prev => ({ ...prev, selectedCategories: getCategories() }));
  };

  const deselectAllCategories = () => {
    setConfig(prev => ({ ...prev, selectedCategories: [] }));
  };

  const handleTimeout = () => {
  const currentQuestion = questions[currentIndex];
  const newRecord: AnswerRecord = {
    question: currentQuestion.question,
    userAnswer: '(Time expired)',
    correctAnswer: Array.isArray(currentQuestion.answer) 
      ? currentQuestion.answer[0] 
      : currentQuestion.answer,
    isCorrect: false,
    skipped: false,
    category: currentQuestion.category
  };
  
  setAnswerRecords([...answerRecords, newRecord]);
  setFeedback('wrong');
  
  const newAnswered = [...answeredQuestions];
  newAnswered[currentIndex] = true;
  setAnsweredQuestions(newAnswered);
};

  const handleSubmit = () => {
  if (feedback !== null || userAnswer.trim() === '') return;

  const currentQuestion = questions[currentIndex];
  const userAnswerLower = userAnswer.trim().toLowerCase();
  
  // Check if answer matches any of the acceptable answers
  const acceptableAnswers = Array.isArray(currentQuestion.answer) 
    ? currentQuestion.answer 
    : [currentQuestion.answer];
  
  const isCorrect = acceptableAnswers.some(
    ans => ans.toLowerCase() === userAnswerLower
  );

  const newRecord: AnswerRecord = {
    question: currentQuestion.question,
    userAnswer: userAnswer.trim(),
    correctAnswer: Array.isArray(currentQuestion.answer) 
      ? currentQuestion.answer[0] 
      : currentQuestion.answer,
    isCorrect,
    skipped: false,
    category: currentQuestion.category
  };

  setAnswerRecords([...answerRecords, newRecord]);
  setFeedback(isCorrect ? 'correct' : 'wrong');
  setScore(isCorrect ? score + 1 : score);

  const newAnswered = [...answeredQuestions];
  newAnswered[currentIndex] = true;
  setAnsweredQuestions(newAnswered);
};

  const handleSkip = () => {
    if (feedback !== null) return;
    
    const newSkipped = [...skippedQuestions, currentIndex];
    setSkippedQuestions(newSkipped);
    
    const newAnswered = [...answeredQuestions];
    newAnswered[currentIndex] = true;
    setAnsweredQuestions(newAnswered);

    goToNextUnanswered();
  };

  const goToNextUnanswered = () => {
    const nextIndex = answeredQuestions.findIndex((answered, idx) => !answered && idx > currentIndex);
    
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
      setUserAnswer('');
      setFeedback(null);
      setShowHint(false);
      setTimeLeft(config.timerEnabled ? config.timerSeconds : 0);
    } else if (skippedQuestions.length > 0) {
      const firstSkipped = skippedQuestions[0];
      setCurrentIndex(firstSkipped);
      setSkippedQuestions(skippedQuestions.slice(1));
      setUserAnswer('');
      setFeedback(null);
      setShowHint(false);
      setTimeLeft(config.timerEnabled ? config.timerSeconds : 0);
    } else {
      finishQuiz();
    }
  };

  const handleNext = () => {
    goToNextUnanswered();
  };

  const finishQuiz = () => {
    sessionStorage.setItem('quizScore', score.toString());
    setScreen('results');
  };

  const handleRestart = () => {
    setLastScore(score);
    setScreen('config');
  };

  const getHint = () => {
  const answer = Array.isArray(questions[currentIndex].answer) 
    ? questions[currentIndex].answer[0] 
    : questions[currentIndex].answer;
  const words = answer.split(' ');
  if (words.length === 1) {
    return `${answer[0]}${'_'.repeat(answer.length - 1)} (${answer.length} letters)`;
  }
  return `${words.length} word(s), starts with "${answer[0]}"`;
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (feedback === null) {
        handleSubmit();
      } else {
        handleNext();
      }
    }
  };

  // Question Management
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const addQuestion = () => {
    if (newQuestion.trim() && newAnswer.trim() && newCategory.trim()) {
      setAllQuestions([...allQuestions, { 
        question: newQuestion.trim(), 
        answer: newAnswer.trim(),
        category: newCategory.trim()
      }]);
      setNewQuestion('');
      setNewAnswer('');
      setNewCategory('');
    }
  };

  const deleteQuestion = (index: number) => {
    setAllQuestions(allQuestions.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
  setEditIndex(index);
  setNewQuestion(allQuestions[index].question);
  const answer = allQuestions[index].answer;
  setNewAnswer(Array.isArray(answer) ? answer.join(' / ') : answer);
  setNewCategory(allQuestions[index].category);
};

  const saveEdit = () => {
    if (editIndex !== null && newQuestion.trim() && newAnswer.trim() && newCategory.trim()) {
      const updated = [...allQuestions];
      updated[editIndex] = { 
        question: newQuestion.trim(), 
        answer: newAnswer.trim(),
        category: newCategory.trim()
      };
      setAllQuestions(updated);
      setEditIndex(null);
      setNewQuestion('');
      setNewAnswer('');
      setNewCategory('');
    }
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setNewQuestion('');
    setNewAnswer('');
    setNewCategory('');
  };

  const getFilteredQuestions = () => {
    if (filterCategory === 'All') return allQuestions;
    return allQuestions.filter(q => q.category === filterCategory);
  };

  // Config Screen
  if (screen === 'config') {
    const categories = getCategories();
    const questionCount = config.selectedCategories.length > 0
      ? allQuestions.filter(q => config.selectedCategories.includes(q.category)).length
      : allQuestions.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Quiz Configuration</h1>
          
          <div className="space-y-6 mb-6">
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">Select Categories</h3>
                <div className="space-x-2">
                  <button
                    onClick={selectAllCategories}
                    className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAllCategories}
                    className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {categories.map(category => {
                  const count = allQuestions.filter(q => q.category === category).length;
                  return (
                    <label key={category} className="flex items-center justify-between cursor-pointer bg-white p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="w-4 h-4 text-indigo-600 rounded mr-2"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </div>
                      <span className="text-xs text-gray-500">({count})</span>
                    </label>
                  );
                })}
              </div>
              {config.selectedCategories.length === 0 && (
                <p className="text-xs text-red-600 mt-2">⚠ Select at least one category</p>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-gray-700">Enable Timer</span>
                <input
                  type="checkbox"
                  checked={config.timerEnabled}
                  onChange={(e) => setConfig({ ...config, timerEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </label>
              {config.timerEnabled && (
                <div className="mt-3">
                  <label className="text-sm text-gray-600 block mb-1">Seconds per question:</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={config.timerSeconds}
                    onChange={(e) => setConfig({ ...config, timerSeconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-gray-700">Enable Hints</span>
                <input
                  type="checkbox"
                  checked={config.hintsEnabled}
                  onChange={(e) => setConfig({ ...config, hintsEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </label>
            </div>
          </div>

          {lastScore !== null && (
            <div className="bg-indigo-50 rounded-lg p-3 mb-6 text-center">
              <p className="text-sm text-gray-600">Last Score: <span className="font-bold text-indigo-600">{lastScore}</span></p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={startQuiz}
              disabled={config.selectedCategories.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Start Quiz ({questionCount} Questions)
            </button>
            <button
              onClick={() => setScreen('manage')}
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200"
            >
              Manage Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question Management Screen
  if (screen === 'manage') {
    const managementCategories = ['All', ...getCategories()];
    const filteredQuestions = getFilteredQuestions();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Manage Questions</h2>
              <button
                onClick={() => setScreen('config')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                ← Back
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">
                {editIndex !== null ? 'Edit Question' : 'Add New Question'}
              </h3>
              <input
                type="text"
                placeholder="Question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-3 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Answer"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-3 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-3 focus:border-indigo-500 focus:outline-none"
                list="categories"
              />
              <datalist id="categories">
                {getCategories().map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <div className="flex gap-2">
                {editIndex !== null ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-all"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={addQuestion}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-all"
                  >
                    Add Question
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Filter by Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                {managementCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat} {cat !== 'All' ? `(${allQuestions.filter(q => q.category === cat).length})` : `(${allQuestions.length})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg mb-2">
                Questions ({filteredQuestions.length})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredQuestions.map((q, index) => {
                  const actualIndex = allQuestions.findIndex(
                    aq => aq.question === q.question && aq.answer === q.answer && aq.category === q.category
                  );
                  return (
                    <div key={actualIndex} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <span className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded mb-2">
                            {q.category}
                          </span>
                          <p className="font-semibold text-gray-800">{q.question}</p>
                          <p className="text-sm text-gray-600">Answer: {q.answer}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(actualIndex)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteQuestion(actualIndex)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results Screen
  if (screen === 'results') {
    const wrongAnswers = answerRecords.filter(r => !r.isCorrect);
    const groupedWrong = wrongAnswers.reduce((acc, record) => {
      if (!acc[record.category]) acc[record.category] = [];
      acc[record.category].push(record);
      return acc;
    }, {} as Record<string, AnswerRecord[]>);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 text-center">
            <p className="text-gray-600 mb-2">Your Score</p>
            <p className="text-5xl font-bold text-indigo-600 mb-2">
              {score}/{questions.length}
            </p>
            <p className="text-lg text-gray-700">
              {Math.round((score / questions.length) * 100)}% Correct
            </p>
          </div>

          {wrongAnswers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Review Wrong Answers:</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedWrong).map(([category, records]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-indigo-700 mb-2 sticky top-0 bg-white py-1">
                      {category} ({records.length})
                    </h4>
                    <div className="space-y-3">
                      {records.map((record, index) => (
                        <div key={index} className="bg-red-50 border-2 border-red-200 rounded-lg p-4 ml-2">
                          <p className="font-semibold text-gray-800 mb-2">{record.question}</p>
                          <p className="text-sm text-red-700">Your answer: {record.userAnswer}</p>
                          <p className="text-sm text-green-700 font-semibold">
                            Correct answer: {Array.isArray(record.correctAnswer) 
                              ? record.correctAnswer.join(' / ') 
                              : record.correctAnswer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleRestart}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading quiz...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = answeredQuestions.filter(a => a).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-sm font-medium text-gray-600">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="ml-2 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                {currentQuestion.category}
              </span>
            </div>
            <div className="flex gap-4 items-center">
              {config.timerEnabled && feedback === null && (
                <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-indigo-600'}`}>
                  ⏱ {timeLeft}s
                </span>
              )}
              <span className="text-sm font-medium text-indigo-600">
                Score: {score}/{answeredCount}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            {currentQuestion.question}
          </h3>

          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={feedback !== null}
            placeholder="Type your answer here..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            autoFocus
          />

          {config.hintsEnabled && !showHint && feedback === null && (
            <button
              onClick={() => setShowHint(true)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              💡 Show Hint
            </button>
          )}

          {showHint && feedback === null && (
            <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Hint:</span> {getHint()}
              </p>
            </div>
          )}

          {feedback && (
            <div className={`mt-4 p-4 rounded-lg ${
              feedback === 'correct' 
                ? 'bg-green-50 border-2 border-green-200' 
                : 'bg-red-50 border-2 border-red-200'
            }`}>
              <p className={`font-semibold ${
                feedback === 'correct' ? 'text-green-700' : 'text-red-700'
              }`}>
                {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong'}
              </p>
              {feedback === 'wrong' && (
                <p className="text-gray-700 mt-1">
                  The correct answer is: <span className="font-semibold">
                    {Array.isArray(currentQuestion.answer) 
                      ? currentQuestion.answer.join(' / ') 
                      : currentQuestion.answer}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {feedback === null ? (
            <>
              <button
                onClick={handleSubmit}
                disabled={userAnswer.trim() === ''}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Submit Answer
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200"
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Next Question →
            </button>
          )}
        </div>

        {skippedQuestions.length > 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">
            {skippedQuestions.length} question(s) skipped - you'll revisit them later
          </p>
        )}
      </div>
    </div>
  );
};

export default Quiz;