
import { useState, type FormEvent } from "react";
import { supabase } from "@/supabaseClient";
import type {
  UserRole,
  ProfessorAccount,
  StudentAccount,
} from "@/types";
import { Icon } from "@/components/Icon";
import collegeLogo from "@/assets/college-logo.jpg";

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function LoginPage({
  onLogin,
}: {
  onLogin: (
    role: UserRole,
    professorAccount?: ProfessorAccount,
    studentAccount?: StudentAccount,
  ) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // 1. Authenticate using Supabase Auth
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
  console.error("Supabase login error:", loginError);

  throw new Error(loginError.message);
}

      if (!data.user) {
        throw new Error("Unable to authenticate your account.");
      }

      // 2. Retrieve the user's role from Supabase profiles
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account profile was not found. Please contact the administrator."
        );
      }

      // 3. Identify the account role
      const normalizedRole = profile.role
        ?.trim()
        .toLowerCase();

      let userRole: UserRole;

      switch (normalizedRole) {
        case "admin":
        case "administrator":
          userRole = "admin";
          break;

        case "professor":
          userRole = "professor";
          break;

        case "student":
          userRole = "student";
          break;

        default:
          await supabase.auth.signOut();

          throw new Error(
            "Your account does not have a valid assigned role."
          );
      }

      // 4. Open the appropriate dashboard
      onLogin(userRole);

    } catch (err: unknown) {
      console.error("Login error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="school-lockup">
          <img
            className="school-logo"
            src={collegeLogo}
            alt="College crest"
          />

          <div>
            <strong>
              COLLEGE OF BUSINESS, MANAGEMENT, SCIENCE AND EDUCATION
            </strong>
            <small>Our Lady of Perpetual Succor College</small>
          </div>
        </div>

        <div className="story-content">
          <span className="story-kicker">
            ClassTrack: Classroom Monitoring and Attendance System
          </span>

          <h1>
            Building a culture of presence and academic excellence.
          </h1>

          <div className="story-feature">
            <span>
              <Icon name="check" size={18} />
            </span>

            <div>
              <strong>Connected campus</strong>
              <small>
                One secure portal for administrators, professors,
                and students.
              </small>
            </div>
          </div>
        </div>

        <p className="story-footer">
          Learning with faith, leading with purpose.
        </p>
      </section>

      <section className="login-panel">
        <div className="mobile-school-name">
          <img
            className="school-logo"
            src={collegeLogo}
            alt="College crest"
          />

          <div>
            <strong>
              COLLEGE OF BUSINESS, MANAGEMENT, SCIENCE AND EDUCATION
            </strong>
            <small>College Portal</small>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-heading">
            <h2>Sign in to your account</h2>
            <p>
              Enter your OLOPSC email address and password.
            </p>
          </div>

          <label className="login-field">
            <span>Email address</span>

            <div>
              <Icon name="students" size={18} />

              <input
                autoComplete="username"
                required
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="Enter your email"
                type="email"
                value={email}
                disabled={loading}
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>

            <div>
              <LockIcon />

              <input
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={loading}
              />

              <button
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword((visible) => !visible)
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexShrink: 0,
                  padding: 0,
                }}
                title={showPassword ? "Hide password" : "Show password"}
                type="button"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          {error && (
            <p className="login-error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <Icon name="chevron" size={18} />}
          </button>
        </form>

        <p className="login-help">
          Need help signing in? Contact the College IT Office.
        </p>
      </section>
    </div>
  );
}
