import { PrismaClient, QuestionDifficulty } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const moduleId =14; // Change this to the desired module ID

  const questions = [
    // 3 beginner
    {
      moduleId,
      questionText: "What is 2 + 2?",
      difficulty: "beginner",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
    },
    {
      moduleId,
      questionText: "What color is the sky on a clear day?",
      difficulty: "beginner",
      options: ["Blue", "Green", "Red", "Yellow"],
      correctAnswer: "Blue",
    },
    {
      moduleId,
      questionText: "Which is a fruit?",
      difficulty: "beginner",
      options: ["Carrot", "Potato", "Apple", "Broccoli"],
      correctAnswer: "Apple",
    },
    // 3 intermediate
    {
      moduleId,
      questionText: "What is the capital of France?",
      difficulty: "intermediate",
      options: ["Berlin", "London", "Paris", "Rome"],
      correctAnswer: "Paris",
    },
    {
      moduleId,
      questionText: "Which planet is known as the Red Planet?",
      difficulty: "intermediate",
      options: ["Earth", "Mars", "Jupiter", "Venus"],
      correctAnswer: "Mars",
    },
    {
      moduleId,
      questionText: "What is the boiling point of water at sea level?",
      difficulty: "intermediate",
      options: ["90°C", "100°C", "110°C", "120°C"],
      correctAnswer: "100°C",
    },
    // 4 advanced
    {
      moduleId,
      questionText: "Who wrote 'To Kill a Mockingbird'?",
      difficulty: "advanced",
      options: ["Harper Lee", "Mark Twain", "Jane Austen", "Ernest Hemingway"],
      correctAnswer: "Harper Lee",
    },
    {
      moduleId,
      questionText: "What is the chemical symbol for gold?",
      difficulty: "advanced",
      options: ["Au", "Ag", "Gd", "Go"],
      correctAnswer: "Au",
    },
    {
      moduleId,
      questionText: "Which gas is most abundant in the Earth's atmosphere?",
      difficulty: "advanced",
      options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
      correctAnswer: "Nitrogen",
    },
    {
      moduleId,
      questionText: "What is the derivative of sin(x)?",
      difficulty: "advanced",
      options: ["cos(x)", "-sin(x)", "-cos(x)", "tan(x)"],
      correctAnswer: "cos(x)",
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        moduleId: q.moduleId,
        questionText: q.questionText,
        difficulty: q.difficulty as QuestionDifficulty,
        options: q.options,
        correctAnswer: q.correctAnswer,
      },
    });
  }

  console.log("Seeded questions for module", moduleId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
