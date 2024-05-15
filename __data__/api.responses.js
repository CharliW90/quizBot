const quizAnswers = require("./quiz.answers");

module.exports = [
  {
    roundDetails: {number: 1, questions: 10, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 11},
      another: {answers: quizAnswers(), score: 7},
      a_third: {answers: quizAnswers(), score: 14}
    }
  },
  {
    roundDetails: {number: 2, questions: 10, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 12},
      another: {answers: quizAnswers(), score: 13},
      someone_else: {answers: quizAnswers(), score: 20}
    }
  },
  {
    roundDetails: {number: 3, questions: 10, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 9},
      another: {answers: quizAnswers(), score: 14},
      a_third: {answers: quizAnswers(), score: 14},
      a_fourth: {answers: quizAnswers(), score: 8}
    }
  },
  {
    roundDetails: {number: 4, questions: 20, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 15},
      another: {answers: quizAnswers(), score: 18},
      a_third: {answers: quizAnswers(), score: 17}
    }
  },
  {
    roundDetails: {number: 5, questions: 10, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 10},
      someone_else: {answers: quizAnswers(), score: 14}
    }
  },
  {
    roundDetails: {number: 6, questions: 10, totalScore: 20},
    results: {
      teamName: {answers: quizAnswers(), score: 18},
      another: {answers: quizAnswers(), score: 19},
      a_third: {answers: quizAnswers(), score: 18},
      late_arrival: {answers: quizAnswers(), score: 12}
    }
  },
];