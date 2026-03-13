import { useState } from "react";
import { createPoll } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

export function PollCreateModal() {
  const auth = useAuthStore((s) => s.auth);
  const { activeChannelId, setPollModalOpen, setPolls, setMessage } = useChatStore();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Ja", "Nein"]);
  const [loading, setLoading] = useState(false);

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!auth || !activeChannelId) return;
    const trimmedQuestion = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion) {
      setMessage("Bitte gib eine Frage ein.");
      return;
    }
    if (validOptions.length < 2) {
      setMessage("Mindestens 2 Optionen erforderlich.");
      return;
    }
    setLoading(true);
    try {
      const created = await createPoll(auth.tokens.accessToken, activeChannelId, {
        question: trimmedQuestion,
        options: validOptions,
      });
      setPolls((prev) => [created, ...prev]);
      setMessage("Umfrage erstellt.");
      setPollModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Umfrage konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setPollModalOpen(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Neue Umfrage</h3>
          <button className="modal-close" onClick={() => setPollModalOpen(false)}>✕</button>
        </div>

        <div className="modal-body">
          <label className="input-label">Frage</label>
          <input
            className="input"
            type="text"
            placeholder="Was möchtest du fragen?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoFocus
            maxLength={200}
          />

          <label className="input-label" style={{ marginTop: "1rem" }}>Optionen</label>
          {options.map((opt, i) => (
            <div key={i} className="poll-option-row">
              <input
                className="input"
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  className="btn-icon btn-danger"
                  onClick={() => removeOption(i)}
                  title="Option entfernen"
                >✕</button>
              )}
            </div>
          ))}

          {options.length < 10 && (
            <button className="btn-ghost" onClick={addOption}>
              + Option hinzufügen
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setPollModalOpen(false)}>Abbrechen</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Erstelle…" : "Umfrage erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
