import { useState, useEffect } from "react";
import { Star, Send, CheckCircle2, AlertCircle, Loader2, MessageSquareHeart, Sparkles, Award } from "lucide-react";
import * as api from "../services/api.js";

export function FeedbackSection() {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [review, setReview] = useState("");
  const [suggestions, setSuggestions] = useState("");

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Live average rating and total members feedback count
  const [stats, setStats] = useState({
    total: 3,
    averageRating: 4.8,
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof api.getFeedbackStats === "function") {
      api
        .getFeedbackStats()
        .then((res) => {
          if (isMounted && res && res.total !== undefined && res.total > 0) {
            setStats({
              total: res.total,
              averageRating: res.averageRating || 4.8,
            });
          }
        })
        .catch(() => {
          // Graceful fallback to initial dataset metrics
        });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    const errs = {};
    if (!rating || rating < 1 || rating > 5) {
      errs.rating = "Please select a rating between 1 and 5 stars.";
    }
    if (!review.trim()) {
      errs.review = "Please enter your feedback or review.";
    } else if (review.trim().length < 5) {
      errs.review = "Feedback should be at least 5 characters.";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await api.submitFeedback({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        rating,
        review: review.trim(),
        suggestions: suggestions.trim() || undefined,
      });

      setStatusMessage({
        type: "success",
        text: response?.message || "Thank you! Your feedback has been recorded in the dataset store.",
      });

      // Update live stats dynamically
      setStats((prev) => {
        const newTotal = prev.total + 1;
        const newAvg = parseFloat(((prev.averageRating * prev.total + rating) / newTotal).toFixed(1));
        return {
          total: newTotal,
          averageRating: newAvg,
        };
      });

      // Clear input fields on successful submission
      setName("");
      setEmail("");
      setReview("");
      setSuggestions("");
      setRating(5);
      setErrors({});
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to transmit feedback. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="feedback" className="relative w-full py-20 px-8 md:px-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.08)] mb-4">
            <MessageSquareHeart size={14} style={{ color: "var(--ember)" }} />
            <span className="echo-mono text-xs tracking-wider uppercase" style={{ color: "var(--ember)" }}>
              User Experience & Evaluation
            </span>
          </div>
          <h2 className="echo-serif text-4xl font-medium mb-3">
            Share Your Feedback
          </h2>
          <p className="text-sm md:text-base mb-6" style={{ color: "var(--ink-dim)" }}>
            Help us evaluate and improve the voice fidelity, response quality, and experience of Digital Memory Companion.
          </p>

          {/* Average Rating & Member Reviews Display Card */}
          <div
            className="inline-flex items-center gap-6 p-4 px-6 rounded-2xl border transition-all duration-300 shadow-xl"
            style={{
              background: "rgba(18, 21, 42, 0.8)",
              borderColor: "rgba(231, 168, 87, 0.35)",
            }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold echo-serif text-[var(--ember)] flex items-center justify-center gap-1.5">
                <Star size={24} className="fill-[var(--ember)] stroke-[var(--ember)]" />
                <span>{stats.averageRating.toFixed(1)}</span>
                <span className="text-xs text-[var(--ink-dim)] font-mono font-normal">/ 5.0</span>
              </div>
              <span className="text-[10px] echo-mono uppercase tracking-wider block mt-0.5" style={{ color: "var(--ink-dim)" }}>
                Average Rating
              </span>
            </div>

            <div className="w-[1px] h-10" style={{ background: "var(--line)" }} />

            <div className="text-left">
              <span className="echo-serif text-lg font-medium text-[var(--ink)] block">
                {stats.total} {stats.total === 1 ? "Review" : "Reviews"} Present
              </span>
              <span className="text-[11px] echo-mono flex items-center gap-1 mt-0.5" style={{ color: "var(--violet)" }}>
                <Sparkles size={11} /> Feedback Dataset Store
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl p-8 md:p-10 border shadow-2xl relative"
          style={{
            background: "var(--panel-solid)",
            borderColor: "var(--line)",
          }}
        >
          {/* Status Feedback Alert */}
          {statusMessage && (
            <div
              role="alert"
              className="mb-8 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in"
              style={{
                background: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                borderColor: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
                color: statusMessage.type === "success" ? "#34d399" : "#f87171",
              }}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Rating (1-5 Stars) */}
          <div className="mb-8">
            <label className="block text-xs echo-mono uppercase tracking-wider mb-2" style={{ color: "var(--ink-dim)" }}>
              Overall Experience Rating <span className="text-[var(--ember)]">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = (hoverRating || rating) >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => {
                      setRating(starValue);
                      if (errors.rating) setErrors((prev) => ({ ...prev, rating: null }));
                    }}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded-lg transition-transform hover:scale-110 echo-focus"
                    aria-label={`Rate ${starValue} of 5 stars`}
                  >
                    <Star
                      size={28}
                      className="transition-colors"
                      style={{
                        fill: isFilled ? "var(--ember)" : "transparent",
                        stroke: isFilled ? "var(--ember)" : "var(--line)",
                      }}
                    />
                  </button>
                );
              })}
              <span className="text-xs echo-mono ml-3 font-semibold" style={{ color: "var(--ember)" }}>
                {rating} / 5 Stars
              </span>
            </div>
            {errors.rating && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.rating}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            {/* Name Field */}
            <div>
              <label htmlFor="feedback-name" className="block text-xs echo-mono uppercase tracking-wider mb-2" style={{ color: "var(--ink-dim)" }}>
                Your Name <span className="text-xs lowercase opacity-70">(optional)</span>
              </label>
              <input
                id="feedback-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3 rounded-xl border text-sm echo-focus bg-[rgba(10,12,22,0.8)] transition-all placeholder:text-[var(--line)]"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="feedback-email" className="block text-xs echo-mono uppercase tracking-wider mb-2" style={{ color: "var(--ink-dim)" }}>
                Your Email <span className="text-xs lowercase opacity-70">(optional)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="alex@example.com"
                className={`w-full px-4 py-3 rounded-xl border text-sm echo-focus bg-[rgba(10,12,22,0.8)] transition-all placeholder:text-[var(--line)] ${
                  errors.email ? "border-red-500" : ""
                }`}
                style={{ borderColor: errors.email ? "#ef4444" : "var(--line)", color: "var(--ink)" }}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Feedback / Review Text */}
          <div className="mb-6">
            <label htmlFor="feedback-review" className="block text-xs echo-mono uppercase tracking-wider mb-2" style={{ color: "var(--ink-dim)" }}>
              Feedback / Review <span className="text-[var(--ember)]">*</span>
            </label>
            <textarea
              id="feedback-review"
              rows={4}
              value={review}
              onChange={(e) => {
                setReview(e.target.value);
                if (errors.review) setErrors((prev) => ({ ...prev, review: null }));
              }}
              placeholder="What did you think of the conversation realism, voice replication, and memory recall?"
              className={`w-full px-4 py-3 rounded-xl border text-sm echo-focus bg-[rgba(10,12,22,0.8)] transition-all placeholder:text-[var(--line)] ${
                errors.review ? "border-red-500" : ""
              }`}
              style={{ borderColor: errors.review ? "#ef4444" : "var(--line)", color: "var(--ink)" }}
            />
            {errors.review && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.review}
              </p>
            )}
          </div>

          {/* Suggestions Field */}
          <div className="mb-8">
            <label htmlFor="feedback-suggestions" className="block text-xs echo-mono uppercase tracking-wider mb-2" style={{ color: "var(--ink-dim)" }}>
              Ideas & Suggestions <span className="text-xs lowercase opacity-70">(optional)</span>
            </label>
            <textarea
              id="feedback-suggestions"
              rows={2}
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Features or enhancements you would love to see..."
              className="w-full px-4 py-3 rounded-xl border text-sm echo-focus bg-[rgba(10,12,22,0.8)] transition-all placeholder:text-[var(--line)]"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium transition-all inline-flex items-center justify-center gap-2 echo-focus disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/20"
            style={{
              background: "var(--ember)",
              color: "#1a1305",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Recording in Dataset...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default FeedbackSection;
