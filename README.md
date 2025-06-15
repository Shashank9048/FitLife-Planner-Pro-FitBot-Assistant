# FitLife Planner Pro + FitBot Assistant

FitLife Planner Pro is a powerful web application that combines workout and nutrition planning with a friendly fitness chatbot assistant — FitBot — to help users stay on track with their health and body transformation goals.

🔥 Live Preview (optional)
[Add a live link here if deployed]

✨ Features
📅 Workout Planner
Add, edit, or delete daily exercises.

Track duration, sets, and reps.

Weekly planner with an interactive accordion layout.

Mark exercises as complete to track consistency.

🍽️ Nutrition Logger
Log meals with calorie and protein intake.

View daily logs and track average calories/protein.

Update and delete meal entries easily.

📊 Progress Dashboard
Visual bar charts showing:

Weekly workout minutes.

Nutrition stats.

Pop-up details on chart bars.

Motivational summaries of progress.

🤖 FitBot Chat Assistant
Powered by Gemini API (Google's generative AI).

Personalized responses to fitness, nutrition, and motivation queries.

Clean chat interface with toggle visibility.

Note: Uses local API key for demo only – do NOT deploy with key in frontend.

📂 Project Structure
plaintext
Copy
Edit
.
├── index.html       # Main HTML layout with sidebar, sections, and chatbot
├── styles.css       # Responsive modern CSS styling for all components
├── script.js        # Core logic: planner, storage, FitBot interaction
└── README.md        # Project overview and usage instructions
🚀 Getting Started
1. Clone the Repo
bash
Copy
Edit
git clone https://github.com/your-username/fitlife-planner-pro.git
cd fitlife-planner-pro
2. Open Locally
Simply open index.html in any browser.

3. Set Up API Key for FitBot (Gemini)
DO NOT deploy with your API key in the frontend.

For local testing:

Replace API_KEY_HERE in script.js with your Gemini API key.

For production:

Set up a secure backend proxy (Node.js/Python/Express/FastAPI).

Store your key server-side.

Communicate via /api/chat endpoint.

💡 Tech Stack
HTML5, CSS3

Vanilla JavaScript (no frameworks)

Gemini AI API (for chatbot)

⚠️ Security Warning
This project uses the Gemini API key on the frontend for demo only. Never expose secret keys in production — set up a secure backend.

📸 Screenshots
You can add preview images of the dashboard, charts, and chatbot here

🙌 Contributing
Pull requests are welcome. If you have ideas for improvements (e.g., dark mode, user login, Firebase storage), feel free to fork and submit!
