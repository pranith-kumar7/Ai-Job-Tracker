import { useEffect, useMemo, useState } from "react";
import { aiApi, getErrorMessage } from "../services/api";
import MarkdownMessage from "./MarkdownMessage";

const tabs = [
  { id: "resume", label: "Resume" },
  { id: "match", label: "Match" },
  { id: "optimize", label: "Optimize" },
  { id: "cover", label: "Cover Letter" },
  { id: "interview", label: "Interview" },
  { id: "chat", label: "Chat" },
];

const emptyResults = {
  analysis: null,
  match: null,
  optimization: null,
  coverLetters: null,
  interviewPrep: null,
  evaluation: null,
  agentResult: null,
};

const downloadText = (filename, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const ResultList = ({ title, items }) => {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="ai-result-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default function AiWorkspace({ onAiActivity }) {
  const [activeTab, setActiveTab] = useState("resume");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const resumePayload = useMemo(
    () => ({
      resume: resumeFile,
      resumeText,
      jobDescription,
      company,
      role,
      targetRole: role,
    }),
    [company, jobDescription, resumeFile, resumeText, role]
  );

  const loadChats = async () => {
    const loaded = await aiApi.listChats();
    setConversations(loaded);
  };

  useEffect(() => {
    loadChats().catch(() => {
      setConversations([]);
    });
  }, []);

  const runTool = async (key, action) => {
    setError(null);
    setIsWorking(true);

    try {
      const value = await action();
      setResults((current) => ({
        ...current,
        [key]: value,
      }));
      await onAiActivity?.();
    } catch (toolError) {
      setError(getErrorMessage(toolError, "AI tool failed."));
    } finally {
      setIsWorking(false);
    }
  };

  const sendMessage = async () => {
    if (!chatMessage.trim()) {
      return;
    }

    setError(null);
    setIsChatLoading(true);

    try {
      const conversation = await aiApi.sendChatMessage({
        conversationId: activeConversation?._id,
        message: chatMessage,
      });
      setActiveConversation(conversation);
      setChatMessage("");
      await loadChats();
      await onAiActivity?.();
    } catch (chatError) {
      setError(getErrorMessage(chatError, "AI chat failed."));
    } finally {
      setIsChatLoading(false);
    }
  };

  const loadConversation = async (id) => {
    setError(null);
    const conversation = await aiApi.getChat(id);
    setActiveConversation(conversation);
  };

  const regenerate = async () => {
    if (!activeConversation?._id) {
      return;
    }

    setIsChatLoading(true);
    try {
      const conversation = await aiApi.regenerateChatResponse(activeConversation._id);
      setActiveConversation(conversation);
      await loadChats();
      await onAiActivity?.();
    } catch (chatError) {
      setError(getErrorMessage(chatError, "AI response could not be regenerated."));
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = async () => {
    if (!activeConversation?._id) {
      setActiveConversation(null);
      return;
    }

    const conversation = await aiApi.clearChat(activeConversation._id);
    setActiveConversation(conversation);
    await loadChats();
  };

  return (
    <section className="ai-workspace">
      <div className="ai-workspace__header">
        <div>
          <p className="eyebrow eyebrow--compact">AI Workspace</p>
          <h2>Resume, match, interview, and chat tools</h2>
        </div>
        <div className="ai-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ai-tab ${activeTab === tab.id ? "ai-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      {activeTab !== "chat" ? (
        <div className="ai-tool-grid">
          <div className="ai-input-panel">
            <label className="field-group">
              <span>Resume file</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="field-group">
              <span>Resume text</span>
              <textarea
                className="input input--textarea"
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste resume text if you are not uploading a file."
                rows={8}
              />
            </label>
            <div className="modal-grid">
              <label className="field-group">
                <span>Company</span>
                <input
                  className="input"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Target company"
                />
              </label>
              <label className="field-group">
                <span>Role</span>
                <input
                  className="input"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Target role"
                />
              </label>
            </div>
            <label className="field-group">
              <span>Job description</span>
              <textarea
                className="input input--textarea"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the job description for matching, optimization, cover letters, and interview prep."
                rows={8}
              />
            </label>
          </div>

          <div className="ai-output-panel">
            <div className="agent-strip">
              <div>
                <strong>Analyze Job Agent</strong>
                <p>Parse the JD, match your resume, optimize it, generate prep assets, and create a board card.</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                disabled={isWorking}
                onClick={() => runTool("agentResult", () => aiApi.analyzeJobAgent(resumePayload))}
              >
                Analyze Job
              </button>
            </div>
            {results.agentResult ? (
              <div className="ai-result-block">
                <h4>Agent Result</h4>
                <p>
                  Created card for {results.agentResult.application.company} - {results.agentResult.application.role}.
                  Match: {results.agentResult.match.matchPercentage}%.
                </p>
                <ResultList title="Follow-up Checklist" items={results.agentResult.followUpChecklist} />
              </div>
            ) : null}

            {activeTab === "resume" ? (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={isWorking}
                  onClick={() => runTool("analysis", () => aiApi.analyzeResume(resumePayload))}
                >
                  {isWorking ? "Analyzing..." : "Analyze Resume"}
                </button>
                {results.analysis ? (
                  <div className="ai-result-stack">
                    <div className="ai-score">
                      <span>ATS Score</span>
                      <strong>{results.analysis.atsScore}%</strong>
                    </div>
                    <p>{results.analysis.resumeSummary}</p>
                    <ResultList title="Missing Keywords" items={results.analysis.missingKeywords} />
                    <ResultList title="Missing Skills" items={results.analysis.missingSkills} />
                    <ResultList title="Weak Sections" items={results.analysis.weakSections} />
                    <ResultList title="Strong Sections" items={results.analysis.strongSections} />
                    <ResultList title="Suggestions" items={results.analysis.improvementSuggestions} />
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === "match" ? (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={isWorking}
                  onClick={() => runTool("match", () => aiApi.matchResume(resumePayload))}
                >
                  {isWorking ? "Matching..." : "Match Resume to Job"}
                </button>
                {results.match ? (
                  <div className="ai-result-stack">
                    <div className="ai-score">
                      <span>Match</span>
                      <strong>{results.match.matchPercentage}%</strong>
                    </div>
                    <p>Hiring Probability: {results.match.hiringProbability}</p>
                    <ResultList title="Matching Skills" items={results.match.matchingSkills} />
                    <ResultList title="Missing Skills" items={results.match.missingSkills} />
                    <ResultList title="Recommendations" items={results.match.recommendations} />
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === "optimize" ? (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={isWorking}
                  onClick={() => runTool("optimization", () => aiApi.optimizeResume(resumePayload))}
                >
                  {isWorking ? "Optimizing..." : "Optimize Resume"}
                </button>
                {results.optimization ? (
                  <div className="ai-result-stack">
                    <div className="ai-result-block">
                      <h4>Better Summary</h4>
                      <p>{results.optimization.betterSummary}</p>
                    </div>
                    <ResultList title="Project Descriptions" items={results.optimization.betterProjectDescriptions} />
                    <ResultList title="Better Skills" items={results.optimization.betterSkills} />
                    <ResultList title="Better Achievements" items={results.optimization.betterAchievements} />
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === "cover" ? (
              <>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={isWorking}
                  onClick={() => runTool("coverLetters", () => aiApi.generateCoverLetters(resumePayload))}
                >
                  {isWorking ? "Writing..." : "Generate Cover Letters"}
                </button>
                {results.coverLetters ? (
                  <div className="ai-result-stack">
                    {Object.entries(results.coverLetters).map(([style, content]) => (
                      <article key={style} className="ai-letter">
                        <div className="section-heading">
                          <h4>{style}</h4>
                          <button
                            type="button"
                            className="button button--ghost button--small"
                            onClick={() => downloadText(`${style}-cover-letter.txt`, content)}
                          >
                            Download
                          </button>
                        </div>
                        <p>{content}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === "interview" ? (
              <>
                <div className="action-row">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={isWorking}
                    onClick={() => runTool("interviewPrep", () => aiApi.generateInterviewPrep(resumePayload))}
                  >
                    {isWorking ? "Preparing..." : "Generate Questions"}
                  </button>
                </div>
                {results.interviewPrep ? (
                  <div className="ai-result-stack">
                    <ResultList title="HR Questions" items={results.interviewPrep.hrQuestions} />
                    <ResultList title="Technical Questions" items={results.interviewPrep.technicalQuestions} />
                    <ResultList title="Behavioral Questions" items={results.interviewPrep.behavioralQuestions} />
                    <ResultList title="Company Questions" items={results.interviewPrep.companySpecificQuestions} />
                  </div>
                ) : null}
                <div className="ai-evaluation-box">
                  <label className="field-group">
                    <span>Question</span>
                    <input
                      className="input"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Paste an interview question"
                    />
                  </label>
                  <label className="field-group">
                    <span>Your answer</span>
                    <textarea
                      className="input input--textarea"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      rows={4}
                    />
                  </label>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={isWorking}
                    onClick={() =>
                      runTool("evaluation", () =>
                        aiApi.evaluateInterviewAnswer({
                          question,
                          answer,
                          jobDescription,
                        })
                      )
                    }
                  >
                    Evaluate Answer
                  </button>
                  {results.evaluation ? (
                    <div className="ai-result-stack">
                      <div className="ai-score">
                        <span>Answer Score</span>
                        <strong>{results.evaluation.score}%</strong>
                      </div>
                      <ResultList title="Feedback" items={results.evaluation.feedback} />
                      <div className="ai-result-block">
                        <h4>Improved Answer</h4>
                        <p>{results.evaluation.improvedAnswer}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="ai-chat-layout">
          <aside className="ai-chat-sidebar">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setActiveConversation(null)}
            >
              New Chat
            </button>
            {conversations.map((conversation) => (
              <button
                key={conversation._id}
                type="button"
                className={`ai-chat-history ${activeConversation?._id === conversation._id ? "ai-chat-history--active" : ""}`}
                onClick={() => loadConversation(conversation._id)}
              >
                {conversation.title}
              </button>
            ))}
          </aside>
          <div className="ai-chat-panel">
            <div className="ai-chat-messages">
              {(activeConversation?.messages ?? []).length === 0 ? (
                <div className="empty-suggestions">Start a conversation about a resume, JD, interview, or job-search plan.</div>
              ) : (
                activeConversation.messages.map((message) => (
                  <article
                    key={message._id ?? `${message.role}-${message.content}`}
                    className={`ai-chat-message ai-chat-message--${message.role}`}
                  >
                    <div className="section-heading">
                      <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                      {message.role === "assistant" ? (
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                        >
                          Copy
                        </button>
                      ) : null}
                    </div>
                    <MarkdownMessage content={message.content} />
                  </article>
                ))
              )}
            </div>
            <label className="field-group">
              <span>Message</span>
              <textarea
                className="input input--textarea"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Ask for resume edits, interview prep, JD analysis, or job-search strategy."
                rows={4}
              />
            </label>
            <div className="action-row">
              <button
                type="button"
                className="button button--primary"
                disabled={isChatLoading}
                onClick={sendMessage}
              >
                {isChatLoading ? "Thinking..." : "Send"}
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={isChatLoading || !activeConversation?._id}
                onClick={regenerate}
              >
                Regenerate
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={isChatLoading}
                onClick={clearChat}
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
