Aurora: AI Voice Concierge 🌌

Aurora is a sophisticated, voice-activated personal assistant web application designed to mimic the experience of a high-end concierge service. Built with React and powered by Google's Gemini 2.5 Flash model, Aurora provides intelligent, context-aware responses with a polite and concise persona.

✨ Features

🎙️ Voice-First Interface: seamless interaction using the browser's native Web Speech API (Speech-to-Text & Text-to-Speech).

🧠 Advanced Intelligence: integrated with Google Gemini API to answer complex queries, general knowledge questions, and conversational logic.

💬 Context Awareness: maintains conversation history, allowing for natural follow-up questions (e.g., asking about the weather in a city, then asking "What about the food there?" without repeating the city name).

🔉 Adaptive Voice Output: automatically selects the smoothest available "Natural" or "Google US English" voice for a premium auditory experience.

🎨 Futuristic UI: a responsive, dark-mode interface built with Tailwind CSS, featuring real-time audio visualizers and smooth animations.

⌨️ Hybrid Input: supports both hands-free voice commands and text-based input for noisy environments.

🛠️ Tech Stack

Frontend: React.js

Styling: Tailwind CSS

Icons: Lucide React

AI Logic: Google Gemini API (gemini-2.5-flash-preview)

Audio: Web Speech API (SpeechSynthesis & SpeechRecognition)

🚀 Getting Started

Prerequisites

Node.js installed

A free Google Gemini API Key from Google AI Studio

Installation

Clone the repository:

git clone [https://github.com/yourusername/aurora-voice-concierge.git](https://github.com/aryan-manish-vaidya/aurora.git)

cd aurora-voice-concierge


Install dependencies:

npm install
or
yarn install


Run the application:

npm start


Configuration:

Open the app in your browser (usually http://localhost:3000).

Click the Settings (⚙️) icon in the top right.

Paste your Gemini API Key.

📖 Usage

Speak: Click the large microphone button (or tap) and ask a question.

Example: "What is the history of Quantum Computing?"

Type: Use the input bar at the bottom for silent queries.

Listen: Aurora will respond verbally and display the text on the screen.

🔮 Future Roadmap

[ ] Wake word detection ("Hey Aurora").

[ ] Integration with calendar APIs for scheduling.

[ ] IoT device control (smart lights/home).
