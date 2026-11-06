import { useState, type FormEvent } from "react"
import {
  roleProfiles,
  professorProfiles,
  studentProfiles,
} from "@/features/shared/data"
import type { UserRole, ProfessorAccount, StudentAccount } from "@/types"
import { Icon } from "@/components/Icon"
import collegeLogo from "@/assets/college-logo.jpg"

type LoginAccount = {
  email: string
  password: string
  role: UserRole
  professorAccount?: ProfessorAccount
  studentAccount?: StudentAccount
}

// Every account that can sign in, built from the existing profile data.
// The role is detected from whichever account matches the email + password.
const allAccounts: LoginAccount[] = [
  {
    email: roleProfiles.admin.email,
    password: roleProfiles.admin.password,
    role: "admin",
  },
  ...(Object.keys(professorProfiles) as ProfessorAccount[]).map((key) => ({
    email: professorProfiles[key].email,
    password: professorProfiles[key].password,
    role: "professor" as UserRole,
    professorAccount: key,
  })),
  ...(Object.keys(studentProfiles) as StudentAccount[]).map((key) => ({
    email: studentProfiles[key].email,
    password: studentProfiles[key].password,
    role: "student" as UserRole,
    studentAccount: key,
  })),
]

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
}

function LockIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg {...svgProps}>
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  )
}

export function LoginPage({
  onLogin,
}: {
  onLogin: (
    role: UserRole,
    professorAccount?: ProfessorAccount,
    studentAccount?: StudentAccount,
  ) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const enteredEmail = email.trim().toLowerCase()
    const match = allAccounts.find(
      (account) =>
        account.email.toLowerCase() === enteredEmail &&
        account.password === password,
    )
    if (!match) {
      setError("The email or password is incorrect.")
      return
    }
    onLogin(match.role, match.professorAccount, match.studentAccount)
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="school-lockup">
          <img
            className="school-logo"
            src={collegeLogo}
            alt="College of Business, Management, Science and Education crest"
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
          <h1>Building a culture of presence and academic excellence.</h1>
          <div className="story-feature">
            <span>
              <Icon name="check" size={18} />
            </span>
            <div>
              <strong>Connected campus</strong>
              <small>
                One secure portal for administrators, professors, and students.
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
            alt="College of Business, Management, Science and Education crest"
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
            <p>Enter your OLOPSC email address and password.</p>
          </div>

          <label className="login-field">
            <span>Email address</span>
            <div>
              <Icon name="students" size={18} />
              <input
                autoComplete="username"
                required
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError("")
                }}
                placeholder="Enter your email"
                type="email"
                value={email}
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
                  setPassword(event.target.value)
                  setError("")
                }}
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
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
          <button className="login-submit" type="submit">
            Sign in
            <Icon name="chevron" size={18} />
          </button>
        </form>
        <p className="login-help">
          Need help signing in? Contact the College IT Office.
        </p>
      </section>
    </div>
  )
}
