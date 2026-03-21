# Survey Builder Cleanup - Code Removal Summary

**Date:** March 16, 2026  
**Status:** ✅ Complete

---

## 🎯 Objective

Remove redundant, confusing features from the old survey generator that conflict with the new **Question Intelligence System** direction.

---

## ❌ Removed Features

### 1. **Starter Pack Options** (Lines removed: ~23)
**What was removed:**
```typescript
const starterPackOptions = [
  {
    id: "community-feedback",
    label: "Community feedback pack",
    description: "For open users and community members...",
    intent: "confusion",
    audience: "community",
  },
  // ... 2 more packs
]
```

**Why removed:**
- Duplicated functionality with new `surveyTemplates`
- Required understanding abstract concepts (intent/audience)
- Less intuitive than category-based browsing

**Replacement:**
- ✅ `surveyTemplates` - Pre-built surveys with clear names (PMF Discovery, User Feedback, etc.)

---

### 2. **buildIntentAlignedPrompts Function** (Lines removed: ~70)
**What was removed:**
```typescript
function buildIntentAlignedPrompts(input: {
  target: string
  changeType: string
  outcome: string
  intent: string
  audience: string
}): string[] {
  // Complex logic generating questions based on intent/audience
}
```

**Why removed:**
- Overly complex (70 lines of conditional logic)
- Generated generic questions dynamically
- Users had to understand "intent modes"
- Duplicated by `questionCategories`

**Replacement:**
- ✅ `questionCategories` - Hand-curated questions organized by type (UX, Product, Feature, etc.)

---

### 3. **buildStarterDecisionReframes Function** (Lines removed: ~30)
**What was removed:**
```typescript
function buildStarterDecisionReframes(input: { 
  audience: string
  target: string
  outcome: string
}): string[] {
  // More dynamic question generation
}
```

**Why removed:**
- Duplicated by `surveyTemplates`
- Added complexity without value
- Questions were less specific than curated templates

**Replacement:**
- ✅ `surveyTemplates` - Proven question patterns ready to use

---

### 4. **applyStarterPack Function** (Lines removed: ~18)
**What was removed:**
```typescript
const applyStarterPack = (pack: { 
  id: string
  label: string
  intent: string
  audience: string
}) => {
  setIntent(pack.intent)
  setAudience(pack.audience)
  const nextPrompts = buildIntentAlignedPrompts({...})
  commitQuestionChange(nextPrompts, 0)
  // ...
}
```

**Why removed:**
- Dependent on removed functions
- Abstract parameter model (intent/audience)
- Less direct than template application

**Replacement:**
- ✅ Template application in Question Intelligence UI - One-click apply with clear outcomes

---

### 5. **"One-click Packs" UI Section** (Lines removed: ~20)
**What was removed:**
```tsx
<div className="rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
  <p className="text-sm font-semibold">One-click packs</p>
  <p>Apply an audience-aware starter pack...</p>
  <div className="grid gap-2 sm:grid-cols-3">
    {starterPackOptions.map((pack) => (
      <button onClick={() => applyStarterPack(pack)}>
        {pack.label}
      </button>
    ))}
  </div>
</div>
```

**Why removed:**
- Referenced removed `starterPackOptions`
- Confusing UX ("What's a pack?")
- Duplicated by Question Intelligence templates

**Replacement:**
- ✅ Question Intelligence panel with clear templates and categories

---

### 6. **"Depth Starters" Section** (Lines removed: ~41)
**What was removed:**
```tsx
<div className="...">
  <p>Depth starters</p>
  <div className="grid gap-2">
    {intentAlignedPrompts.map((template) => (
      <button>{template}</button>
    ))}
  </div>
  <Button onClick={undoQuestionChange}>Undo</Button>
  <Button onClick={() => commitQuestionChange(intentAlignedPrompts, 0)}>
    Apply decision-aligned starter flow
  </Button>
</div>
```

**Why removed:**
- Referenced removed `intentAlignedPrompts`
- Multiple buttons for same action (confusing)
- Undo button buried in wrong section
- Redundant with Question Intelligence

**Replacement:**
- ✅ Single, unified Question Intelligence panel
- ✅ Clear category browser
- ✅ Voice tips always visible
- ✅ Undo button in logical location (question editor)

---

## 📊 Impact Summary

### Code Reduction
- **Total lines removed:** ~202 lines
- **Functions removed:** 3 complex functions
- **UI sections removed:** 3 duplicate sections
- **State variables removed:** `applyStarterPack` function + dependencies

### Complexity Reduction
- **Before:** 3 ways to add questions (packs, depth starters, intent-aligned prompts)
- **After:** 2 clear ways (templates, categories)

### Cognitive Load Reduction
- **Before:** Understand "intent modes", "audience types", "packs", "starters"
- **After:** Browse by category or pick a template

---

## ✅ What Remains (Focused & Clear)

### Core Features Kept:
1. ✅ **Quality Gate** - Minimum 60% score required
2. ✅ **Starter Questions** - 3 high-quality defaults
3. ✅ **Question Intelligence Panel** - Templates + Categories + Tips
4. ✅ **Visual Quality Indicators** - Scores on each question
5. ✅ **Question Count Guidance** - Warning at 4+ questions
6. ✅ **Voice Tips** - Always-visible best practices

### Simplified Mental Model:
```
Old Flow:
1. Pick intent mode (confusion/critique/emotion/validation)
2. Pick audience (builders/community/customers)
3. Choose: packs OR depth starters OR intent-aligned prompts
4. Confused about which to use

New Flow:
1. Pick template (PMF Discovery, User Feedback, etc.)
   OR
2. Browse category (UX, Product, Feature, etc.)
3. Add questions
4. Done
```

---

## 🧹 Dead Code Elimination

### Unused Imports Still Present:
- None identified (all imports still used)

### Unused Variables Removed:
- ✅ `starterPackOptions` constant
- ✅ `applyStarterPack` function
- ✅ `intentAlignedPrompts` variable
- ✅ `starterDecisionReframes` variable
- ✅ `buildIntentAlignedPrompts` function
- ✅ `buildStarterDecisionReframes` function

### Comments Added:
All removals marked with comments like:
```typescript
// REMOVED: starterPackOptions - Replaced by surveyTemplates in Question Intelligence System
// REMOVED: buildIntentAlignedPrompts - Replaced by questionCategories
```

---

## 🎯 Consistency Achieved

### Before (Confusing):
- Multiple overlapping systems
- Abstract terminology (intent/audience)
- Dynamic generation vs curation mix
- Unclear which tool to use when

### After (Clear):
- Single Question Intelligence System
- Concrete categories (UX, Product, Feature)
- Curated templates with proven patterns
- Obvious path: pick template or browse

---

## 🚀 Next Steps

1. ✅ **Test locally** - Verify no broken references
2. ✅ **Deploy to production** - Push clean code
3. ✅ **Monitor analytics** - Track template/category usage
4. ✅ **Gather feedback** - Ask creators if it's clearer

---

## 📝 Files Modified

- ✅ `app/admin/questionnaires/v1/page.tsx` - Removed ~202 lines of duplicate/confusing code

---

## 💡 Key Principle Applied

> "Simplicity is the ultimate sophistication."

Instead of:
- Adding more features
- Building clever abstractions
- Creating complex routing

We:
- Removed duplicate systems
- Made the good stuff obvious
- Reduced cognitive load

**Result:** A focused, consistent survey builder that teaches creators how to ask great questions.

---

**This cleanup ensures the Question Intelligence System isn't just added on top—it becomes THE way to use Audioform.** 🧠✨
