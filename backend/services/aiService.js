const axios = require('axios');
require('dotenv').config();

const callOpenRouter = async (prompt) => {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'openrouter/free', 
      messages: [
        { 
          
          role: 'user', 
          content: prompt 
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data || !response.data.choices || response.data.choices.length === 0) {
    throw new Error('OpenRouter вернул пустой ответ');
  }

  return response.data.choices[0].message.content;
};

const getAIHint = async (user_id, task_content, student_answer, user_question) => {
  
  const normalizedQuestion = user_question?.trim() ;

  const prompt = `ДАННЫЕ ДЛЯ РАБОТЫ:
Условие задачи: "${task_content}"
Текущий ответ ученика: "${student_answer || 'пока нет ответа'}"

ИНСТРУКЦИЯ ДЛЯ ТЕБЯ (ЧИТАТЬ СТРОГО):
Ты — школьный учитель математики. Твоя цель — дать подсказку ученику по задаче выше.

ПРАВИЛА ОТВЕТА (КРИТИЧЕСКИ ВАЖНО):
1. ФИЛЬТР ВОПРОСА: Прочитай сообщение ученика ниже. Если оно про погоду, жизнь, игры, глаголы или любой другой не-математический бред — напиши ТОЛЬКО: "Извините, я помогаю только с математикой и текущей задачей." и больше ничего не пиши.
2. ФОРМАТИРОВАНИЕ: НИКАКОГО Markdown (никаких звездочек ** и решеток #). Пиши простым текстом.
3. ФОРМУЛЫ: НИКАКИХ одинарных знаков доллара $! Для переменных и чисел ВНУТРИ текста (инлайн) используй круглые скобки со слешем: \\( и \\). Для больших формул на отдельных строках используй двойные доллары $$.
4. ПОДСКАЗКА: Если вопрос действительно по задаче, дай небольшую подсказку или объясни правило. НЕ давай готовый ответ.

СООБЩЕНИЕ УЧЕНИКА: "${normalizedQuestion}"

ТВОЙ ОТВЕТ:`;

  try {
    const response = await callOpenRouter(prompt);
    return response;
  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
    return 'Извините, нейросеть сейчас перегружена. Попробуйте нажать кнопку еще раз через пару секунд.';
  }
};

module.exports = { getAIHint };