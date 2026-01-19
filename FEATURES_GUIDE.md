# Quick Reference: Feature Overview

## 🎯 Difficulty Levels
Users can now select difficulty **before** generating a scenario:
- **Easy** - Simpler problems, encouraging judges
- **Normal** - Standard FBLA level, rigorous evaluation  
- **Hard** - Complex scenarios, highly critical judges
- **Impossible** - Extremely complex, very demanding judges

### How It Works:
1. User selects event
2. User selects difficulty (new step!)
3. Scenario generates at that difficulty level
4. Judges evaluate with difficulty-appropriate standards

## 🔄 Q&A Timing
Users can choose when Q&A questions are generated:
- **Before Recording** (default) - Questions generated from scenario alone
- **After Recording** - Questions generated from actual presentation transcript

### How It Works:
1. User selects timing preference in difficulty screen
2. If "before": Questions generated and shown to read before presentation
3. If "after": Presentation recorded first, then questions generated

## 📊 Enhanced Grading

### Study/Test (app.js)
- Professional-level scoring standards applied
- Scores 70-80% = solid competency (not typical excellence)
- Specific identification of conceptual gaps
- "No clear strengths identified" when applicable
- Actionable improvement steps

### Role Play Judging (roleplay.js)
- Judge evaluation modifiers based on difficulty
- Varying score ranges:
  - Easy: 30-100 (mostly 70+)
  - Normal: 20-95 (typical 60-70)
  - Hard: 15-85 (typical 45-60)
  - Impossible: 10-75 (typical 35-50)
- Can state "No clear strengths demonstrated"

## 🤖 AI Improvements

### System Prompts Updated For:
1. **Realism** - Professional standards, not inflated feedback
2. **Criticality** - Direct about weaknesses, specific gaps
3. **Honesty** - Acknowledges when no strengths present
4. **Specificity** - Identifies exactly what needs work
5. **Actionability** - Provides concrete next steps

### Specific Changes:
- Judges now consider difficulty when scoring
- Overall test review emphasizes rigor
- Question-level feedback targets conceptual understanding
- Feedback ranges adjusted by difficulty
- Third-person perspective enforced for professionalism

## 📁 Files Modified

### HTML
- **roleplay.html**: Added difficulty selection screen, Q&A timing radio buttons

### JavaScript  
- **roleplay.js**:
  - Added `selectDifficulty()`, `setQATiming()`, `goBackEventSelection()`
  - Added `generateQAQuestionsBeforePresentation()` 
  - Modified `generateScenario()` for difficulty awareness
  - Modified `runJudgeEvaluation()` for difficulty-based scoring
  - Updated `showScreen()` to include difficulty screen
  - Updated judge evaluation system prompts

- **app.js**:
  - Enhanced `overallSystem` prompt for rigor
  - Enhanced `chunkSystem` prompt for rigor
  - Updated `renderAISummaryPanel()` to handle "no strengths"

## 🔧 Technical Implementation

### State Management
```javascript
appState.difficulty = 'normal' // 'easy', 'normal', 'hard', 'impossible'
appState.qaTiming = 'before'   // 'before' or 'after'
```

### Key Functions
- Difficulty-aware scenario generation
- Difficulty-aware judge system prompts
- Difficulty-aware Q&A question generation
- Pre-presentation and post-presentation Q&A modes
- "No strengths" detection and display

## ✨ User Experience Enhancements

1. **Choice and Control**: Users pick difficulty level they want
2. **Flexibility**: Can do Q&A before or after presentation
3. **Realistic Feedback**: Scores reflect actual performance, not inflated
4. **Honest Assessment**: System openly identifies gaps and strengths
5. **Actionable Guidance**: Specific recommendations for improvement
6. **Appropriate Challenge**: Judges are appropriately strict per difficulty

## 🧪 Testing Checklist

- [ ] Select each difficulty level and verify scenarios differ
- [ ] Check Q&A "before" generates before presentation starts
- [ ] Check Q&A "after" generates after presentation ends
- [ ] Verify judge scores vary appropriately by difficulty
- [ ] Test poor performance shows "No clear strengths identified"
- [ ] Check study test feedback is appropriately critical
- [ ] Verify all system prompts are being used correctly
- [ ] Test on different browsers/devices for UI consistency
