# Online Test Application

A modern, responsive web-based test application built with HTML, CSS, and JavaScript.

## Features

- 📚 **Dynamic Question Loading**: Questions are loaded from a JSON file
- 🎯 **Interactive UI**: Modern, responsive design with smooth animations
- ⏱️ **Timer**: Real-time timer to track test duration
- 🧭 **Navigation**: Easy navigation between questions with visual indicators
- 📊 **Score Calculation**: Automatic scoring with detailed results
- 📝 **Answer Review**: Review all answers with correct/incorrect indicators
- 🔄 **Retake Option**: Ability to retake the test
- 📱 **Mobile Responsive**: Works perfectly on all device sizes

## Files Structure

```
📁 Take Test/
├── 📄 index.html       # Main HTML file
├── 🎨 style.css        # Styling and animations
├── ⚙️ script.js        # JavaScript functionality
├── 📋 questions.json   # Questions database
└── 📖 README.md        # This file
```

## How to Use

### 1. Running the Application

1. Open `index.html` in a web browser
2. Click "Start Test" to begin
3. Answer questions by clicking on options
4. Navigate using Previous/Next buttons or question numbers
5. Submit the test when completed
6. Review your results and answers

### 2. Customizing Questions

Edit the `questions.json` file to add your own questions. Each question follows this format:

```json
{
  "question": "Your question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 2
}
```

**Important Notes:**
- `correct` field uses 0-based indexing (0 = first option, 1 = second option, etc.)
- You can have 2-4 options per question
- Questions can be of any type: multiple choice, true/false, etc.

### 3. Question Format Examples

**Multiple Choice (4 options):**
```json
{
  "question": "What is the capital of France?",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correct": 2
}
```

**True/False:**
```json
{
  "question": "The Earth is flat.",
  "options": ["True", "False"],
  "correct": 1
}
```

**3 Options:**
```json
{
  "question": "Which is a programming language?",
  "options": ["HTML", "JavaScript", "CSS"],
  "correct": 1
}
```

## Features Breakdown

### 🖥️ User Interface

- **Welcome Screen**: Instructions and start button
- **Question Screen**: Main test interface with navigation
- **Results Screen**: Score display with performance feedback
- **Review Screen**: Detailed answer review

### 📊 Scoring System

- **Automatic Calculation**: Scores calculated in real-time
- **Percentage Display**: Shows percentage alongside raw score
- **Performance Feedback**: Dynamic feedback based on score
- **Visual Score Circle**: Animated circular progress indicator

### 🎯 Navigation Features

- **Question Grid**: Visual grid showing all questions
- **Status Indicators**: 
  - 🔵 Current question (blue)
  - 🟢 Answered questions (green)
  - ⚪ Unanswered questions (white)
- **Previous/Next Buttons**: Sequential navigation
- **Direct Access**: Click any question number to jump directly

### ⏱️ Timer

- Real-time elapsed time display
- Automatic start when test begins
- Final time recorded in results

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## Technical Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Local Storage**: Preserves test state during session
- **JSON Data Loading**: Easy question management
- **Modern CSS**: Gradient backgrounds, animations, glassmorphism effects
- **Accessibility**: Keyboard navigation support
- **Error Handling**: Graceful fallbacks for missing files

## Customization Tips

### Colors and Styling

Edit `style.css` to change:
- Color scheme (search for color codes like `#667eea`)
- Button styles
- Animation timing
- Layout spacing

### Functionality

Edit `script.js` to modify:
- Timer behavior
- Scoring rules
- Navigation logic
- Performance feedback messages

### Questions

- Add unlimited questions to `questions.json`
- Mix different question types
- Include images in questions (update HTML/CSS accordingly)

## Performance Features

- **Fast Loading**: Optimized code for quick startup
- **Smooth Animations**: CSS transitions for better UX
- **Memory Efficient**: Minimal memory footprint
- **No Dependencies**: Pure HTML/CSS/JS, no external libraries

## Future Enhancements

Possible additions:
- Question categories
- Difficulty levels
- Time limits per question
- Question randomization
- Export results to PDF
- Multiple test sessions
- User accounts and history

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify `questions.json` format is correct
3. Ensure all files are in the same directory
4. Test with a simple HTTP server if needed

Happy testing! 🎉