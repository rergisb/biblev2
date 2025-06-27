const GEMINI_API_KEY = 'AIzaSyDBysJ2sXRj7I2OXIHakLF_fFiXmJrIxOQ';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export const generateGeminiResponse = async (userMessage: string): Promise<string> => {
  try {
    // Enhanced Bible-focused system prompt with specific verse reading instructions
    const systemPrompt = `You are a compassionate and knowledgeable Bible companion. Use the following principles in responding to users:

CORE PRINCIPLES:
- Provide scriptural insights and references that support spiritual reflection and understanding.
- Offer pastoral encouragement, wisdom, and comfort grounded in biblical principles.
- Help users explore theological, historical, and literary context of Bible passages.
- Be gentle and respectful in tone, encouraging personal growth and faith journeys.
- Answer questions with a balance of direct support and prompts for deeper spiritual exploration.
- Encourage prayerful and meditative reflection on the Word of God.
- Keep responses suitable for voice synthesis (clear, natural speech patterns).
- Keep responses concise but meaningful (1-3 sentences typically).

BIBLE VERSE READING INSTRUCTIONS:
1) ALWAYS read the complete Bible verse when instructed or when a specific verse is requested.
   - Include the full text of the verse, not just a reference
   - Read it clearly and completely before any additional commentary
   - Use phrases like "Here is [verse reference]:" followed by the complete verse text

2) After reading the verse, ALWAYS offer commentary by saying something like:
   - "Would you like me to provide some commentary on this verse?"
   - "I can offer some insights about this passage if you'd like to explore it further."
   - "Would you like to discuss what this verse means for your life today?"

EXAMPLES:
User: "Read John 3:16"
Response: "Here is John 3:16: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' Would you like me to provide some commentary on this beautiful verse about God's love?"

User: "What does Psalm 23 say?"
Response: "Here is Psalm 23:1: 'The Lord is my shepherd, I lack nothing.' This is the beginning of one of the most beloved psalms. Would you like me to read the entire psalm or provide insights about this opening verse?"

User: "Tell me about love"
Response: "The Bible speaks beautifully about love. Here is 1 Corinthians 13:4-5: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.' Would you like me to share more about what this passage teaches us about love?"

User question: ${userMessage}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 400, // Increased to accommodate verse text + commentary offer
        topP: 0.8,
        topK: 40
      }
    };

    // Use the correct API endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini API');
    }

    const generatedText = data.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Empty response from Gemini API');
    }

    return generatedText.trim();

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Enhanced fallback responses that include verse reading when appropriate
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for specific verse requests
    if (lowerMessage.includes('john 3:16') || lowerMessage.includes('john 3 16')) {
      return "Here is John 3:16: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' Would you like me to provide some commentary on this verse about God's amazing love?";
    }
    
    if (lowerMessage.includes('psalm 23')) {
      return "Here is Psalm 23:1: 'The Lord is my shepherd, I lack nothing.' This is the beginning of the beloved shepherd psalm. Would you like me to share more verses from this psalm or provide insights about God as our shepherd?";
    }
    
    if (lowerMessage.includes('1 corinthians 13') || lowerMessage.includes('love chapter')) {
      return "Here is 1 Corinthians 13:4: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.' This is from the famous love chapter. Would you like me to continue reading or share insights about biblical love?";
    }
    
    if (lowerMessage.includes('verse') || lowerMessage.includes('scripture') || lowerMessage.includes('read')) {
      return "I'm having trouble connecting right now, but here's a beautiful verse: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.' - Jeremiah 29:11. Would you like me to share insights about God's plans for your life?";
    }
    
    if (lowerMessage.includes('pray') || lowerMessage.includes('prayer')) {
      return "Even when I can't connect fully, remember that God hears your prayers. Here is Philippians 4:6: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.' Would you like me to share more about the power of prayer?";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('guidance')) {
      return "I'm experiencing some connection issues, but God's guidance is always available. Here is Proverbs 3:5: 'Trust in the Lord with all your heart and lean not on your own understanding.' Would you like me to share more about trusting in God's guidance?";
    }
    
    return "I'm having trouble connecting to provide you with biblical guidance right now. Please try again in a moment. Remember, God is always with you, and His Word never fails.";
  }
};

export const testGeminiConnection = async (): Promise<boolean> => {
  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Hello! Just testing the connection. Please respond with a brief greeting."
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 50,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    return response.ok;
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return false;
  }
};