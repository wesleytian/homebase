import { useState, useRef, useEffect } from 'react';
import {
  Todo,
  ToggleSection,
  Goal,
  JournalEntry,
  RoutineWithProgress,
  Friend,
  AppSettings,
  AI_HELP_OPTIONS,
  COMPANY_STAGE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  HOBBY_FREQUENCY_OPTIONS,
} from './types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Props {
  settings: AppSettings;
  todos: Todo[];
  sections: ToggleSection[];
  lifeGoals: Goal[];
  yearlyGoals: Goal[];
  quarterlyGoals: Goal[];
  routines: RoutineWithProgress[];
  journalEntries: JournalEntry[];
  friends: Friend[];
  onNavigateToSettings: () => void;
}

export function AIChat({
  settings,
  todos,
  sections,
  lifeGoals,
  yearlyGoals,
  quarterlyGoals,
  routines,
  journalEntries,
  friends,
  onNavigateToSettings,
}: Props) {
  const apiKey = settings.anthropicApiKey;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const buildContext = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Build todos context
    const todosBySection: Record<string, Todo[]> = { unsectioned: [] };
    sections.forEach(s => { todosBySection[s.name] = []; });
    todos.forEach(t => {
      const section = sections.find(s => s.id === t.sectionId);
      if (section) {
        todosBySection[section.name].push(t);
      } else {
        todosBySection.unsectioned.push(t);
      }
    });

    let todosText = '';
    for (const [sectionName, sectionTodos] of Object.entries(todosBySection)) {
      if (sectionTodos.length > 0) {
        todosText += `\n${sectionName === 'unsectioned' ? 'Unsectioned' : sectionName}:\n`;
        sectionTodos.forEach(t => {
          todosText += `  ${t.completed ? '[x]' : '[ ]'} ${t.text}\n`;
        });
      }
    }

    // Build goals context
    const goalsText = `
Life Goals:
${lifeGoals.map(g => `- ${g.title}${g.description ? `: ${g.description}` : ''}`).join('\n') || '(none set)'}

2026 Goals:
${yearlyGoals.map(g => `- ${g.title}${g.description ? `: ${g.description}` : ''}`).join('\n') || '(none set)'}

Q1 2026 Goals:
${quarterlyGoals.map(g => `- ${g.title}${g.description ? `: ${g.description}` : ''}`).join('\n') || '(none set)'}`;

    // Build routines context (X/Y = completed X times out of Y target for the week)
    const routinesText = routines.length > 0
      ? routines.map(r => `- ${r.name}: ${r.completedThisWeek}/${r.frequencyPerWeek} completed this week${r.metadata ? ` (${r.metadata})` : ''}`).join('\n')
      : '(none set)';

    // Build recent journal context (last 7 entries)
    const recentJournals = journalEntries.slice(0, 7);
    const journalText = recentJournals.length > 0
      ? recentJournals.map(j => {
          let entry = `${j.date}:`;
          if (j.gratefulFor) entry += `\n  Grateful for: ${j.gratefulFor}`;
          if (j.makeItGreat) entry += `\n  Make it great: ${j.makeItGreat}`;
          if (j.amazingThings) entry += `\n  Amazing things: ${j.amazingThings}`;
          if (j.learned) entry += `\n  Learned: ${j.learned}`;
          return entry;
        }).join('\n\n')
      : '(no recent entries)';

    // Build friends context
    const friendsText = friends.length > 0
      ? friends.map(f => `- ${f.name}${f.notes ? ` (${f.notes})` : ''}`).join('\n')
      : '(none added)';

    // Build user context from settings
    let userContextText = '';
    if (settings.userRole) {
      userContextText += `Role: ${settings.userRole}\n`;
    }
    if (settings.aiHelpPreferences.length > 0) {
      const prefLabels = settings.aiHelpPreferences
        .map(p => AI_HELP_OPTIONS.find(o => o.value === p)?.label)
        .filter(Boolean);
      userContextText += `What they want from AI: ${prefLabels.join(', ')}\n`;
    }
    if (settings.companyStage) {
      const stageLabel = COMPANY_STAGE_OPTIONS.find(o => o.value === settings.companyStage)?.label;
      userContextText += `Company stage: ${stageLabel}\n`;
    }
    if (settings.teamSize) {
      const sizeLabel = TEAM_SIZE_OPTIONS.find(o => o.value === settings.teamSize)?.label;
      userContextText += `Team size: ${sizeLabel}\n`;
    }
    if (settings.energyLevel) {
      const energyLabel = ENERGY_LEVEL_OPTIONS.find(o => o.value === settings.energyLevel)?.label;
      userContextText += `Current energy level: ${energyLabel}\n`;
    }
    // Personal info
    if (settings.location) {
      userContextText += `Location: ${settings.location}\n`;
    }
    if (settings.birthMonth && settings.birthDay && settings.birthYear) {
      const birth = new Date(parseInt(settings.birthYear), parseInt(settings.birthMonth) - 1, parseInt(settings.birthDay));
      const todayDate = new Date();
      let age = todayDate.getFullYear() - birth.getFullYear();
      const monthDiff = todayDate.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && todayDate.getDate() < birth.getDate())) {
        age--;
      }
      userContextText += `Age: ${age}\n`;
    }
    if (settings.heightUnit === 'ft' && (settings.heightFeet || settings.heightInches)) {
      userContextText += `Height: ${settings.heightFeet || 0}' ${settings.heightInches || 0}"\n`;
    } else if (settings.heightUnit === 'cm' && settings.heightCm) {
      userContextText += `Height: ${settings.heightCm} cm\n`;
    }
    if (settings.weightUnit && settings.weightValue) {
      userContextText += `Weight: ${settings.weightValue} ${settings.weightUnit}\n`;
    }
    if (settings.hobbies && settings.hobbies.length > 0) {
      const hobbiesText = settings.hobbies.map(h => {
        const freqLabel = HOBBY_FREQUENCY_OPTIONS.find(o => o.value === h.frequency)?.label || h.frequency;
        return `${h.name} (${freqLabel})`;
      }).join(', ');
      userContextText += `Hobbies: ${hobbiesText}\n`;
    }

    return `You are an AI assistant integrated into Command Center, a personal life operating system.

TODAY'S DATE: ${today}

${userContextText ? `USER CONTEXT:\n${userContextText}` : ''}
You have access to the user's:
- Todos and tasks (organized by sections, often dated)
- Life goals, yearly goals, and quarterly goals
- Weekly routines and habits
- Gratitude journal entries
- Friends list

IMPORTANT - Understanding the data:
- Weekly routine numbers show progress SO FAR this week (e.g., "2/7 completed this week" means they've done it 2 times out of their 7-times-per-week goal, with the week still in progress)
- Todo sections may be dated (e.g., "Mon, 1/20") - compare against today's date to understand what's current vs past
- If you notice date inconsistencies or contradictions in the data, ask for clarification rather than assuming

ANALYSIS GUIDELINES:
- Weekly routines: It's normal to be "behind" early in the week - only flag genuine issues
- Todo variety: Different domains in one day may reflect legitimate business priorities, not poor focus
- Avoid judgmental language like "scattered" or "behind" without clear evidence
- Ask clarifying questions rather than making assumptions about problems

Your role is to:
1. Provide objective observations about their data
2. Help prioritize todos based on their goals
3. Identify automation/delegation opportunities when asked
4. Answer questions about their data and help them reflect
5. Only suggest problems exist when there's clear evidence

Be concise, practical, and supportive. When making suggestions, be specific and reference their actual data.

DEFAULT STANCE: Assume their systems are working unless data clearly indicates otherwise. Focus on support rather than problem-finding.

=== CURRENT DATA ===

TODOS:${todosText || '\n(no todos)'}

GOALS:${goalsText}

WEEKLY ROUTINES (format: completed/target this week):
${routinesText}

RECENT JOURNAL ENTRIES:
${journalText}

FRIENDS:
${friendsText}

=== END DATA ===`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = buildContext();
      // Filter out system messages (errors) - API only accepts user/assistant
      const conversationMessages = [...messages, userMessage]
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: conversationMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const assistantContent = data.content[0]?.text || 'Sorry, I could not generate a response.';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error('API error:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const suggestions = [
    "What should I focus on today?",
    "Which of my todos align with my goals?",
    "What patterns do you see in my routines?",
    "What could I automate or delegate?",
  ];

  return (
    <>
      <button className="ai-chat-button" onClick={() => setIsOpen(!isOpen)} title="AI Assistant">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <circle cx="7.5" cy="14.5" r="1.5"/>
          <circle cx="16.5" cy="14.5" r="1.5"/>
        </svg>
      </button>

      {isOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <h3>AI Assistant</h3>
            <div className="ai-chat-header-actions">
              <button
                className="ai-context-btn"
                onClick={() => setShowContext(true)}
                title="View context sent to AI"
              >
                Context
              </button>
              <button className="ai-chat-close" onClick={() => setIsOpen(false)}>×</button>
            </div>
          </div>

          {!apiKey ? (
            <div className="ai-no-key">
              <p>Add your Anthropic API key in Settings to enable the AI assistant.</p>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToSettings(); setIsOpen(false); }}>
                Go to Settings →
              </a>
            </div>
          ) : (
            <>
              <div className="ai-chat-messages">
                {messages.length === 0 ? (
                  <div className="ai-chat-empty">
                    <p>I can help you prioritize, find patterns, and make suggestions based on your Command Center data.</p>
                    <div className="ai-chat-suggestions">
                      {suggestions.map((s, i) => (
                        <button key={i} className="ai-chat-suggestion" onClick={() => handleSuggestionClick(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => (
                      <div key={i} className={`ai-chat-message ${m.role}`}>
                        {m.content.split('\n').map((line, j) => (
                          <p key={j}>{line}</p>
                        ))}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="ai-chat-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="ai-chat-input-area" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  className="ai-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  disabled={isLoading}
                />
                <button type="submit" className="ai-chat-send" disabled={!input.trim() || isLoading}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {showContext && (
        <div className="ai-context-overlay" onClick={() => setShowContext(false)}>
          <div className="ai-context-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-context-header">
              <h3>System Context</h3>
              <button className="ai-chat-close" onClick={() => setShowContext(false)}>×</button>
            </div>
            <div className="ai-context-content">
              <pre>{buildContext()}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
