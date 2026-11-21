import { supabase } from "@/supabaseClient"
import { useEffect, useState } from "react"
import {
  navigation,
  Page,
  roleProfiles,
  professorProfiles,
  studentProfiles,
  courseSections,
  adminClassSchedule,
  teacherNameOverrides,
} from "@/features/shared/data"
import { UserRole, ProfessorAccount, StudentAccount } from "@/types"
import { Icon } from "@/components/Icon"
import {
  Overview,
  AdminStudentRegistry,
  ProfessorStudentDirectory,
  AdminClassSchedule,
  ProfessorClasses,
  DirectoryPage,
  AdminTeacherDirectory,
  AdminAttendanceOverview,
  AttendancePage,
  AdminReportsOverview,
  ReportsPage,
} from "@/features"
import { LoginPage } from "@/features/auth/EmailLoginPage"

interface DbStudentProfile {
  id: string | number
  user_id?: string | null
  student_number?: string | null
  full_name: string
  email?: string | null
  program?: string | null
  year_level?: string | number | null
}

function getInitials(fullName: string): string {
  const cleaned = fullName.trim()
  if (!cleaned) return "ST"

  if (cleaned.includes(",")) {
    const [lastPart, firstPart] = cleaned.split(",").map((s) => s.trim())
    const firstInitial = firstPart?.[0] || ""
    const lastInitial = lastPart?.[0] || ""
    return (firstInitial + lastInitial || cleaned.slice(0, 2)).toUpperCase()
  }

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatProgramShort(program?: string | null): string {
  const raw = (program || "").trim()
  if (!raw) return "BSCS"
  const upper = raw.toUpperCase()
  if (upper === "BSCS" || upper.includes("COMPUTER SCIENCE")) return "BSCS"
  if (upper === "ACT" || upper.includes("COMPUTER TECHNOLOGY")) return "ACT"
  return raw
}

function formatProgramFull(program?: string | null): string {
  const raw = (program || "").trim()
  if (!raw) return "Bachelor of Science in Computer Science"
  const upper = raw.toUpperCase()
  if (upper === "BSCS") return "Bachelor of Science in Computer Science"
  if (upper === "ACT") return "Associate in Computer Technology"
  return raw
}

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [professorAccount, setProfessorAccount] = useState<ProfessorAccount>("ruby")
  const [studentAccount, setStudentAccount] = useState<StudentAccount>("marc")
  const [dbStudent, setDbStudent] = useState<DbStudentProfile | null>(null)
  const [page, setPage] = useState<Page>("overview")
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  useEffect(() => {
    const restoreSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) return

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", session.user.id)
        .single()

      if (profileError || !profile) {
        console.error("Profile loading failed:", profileError?.message)
        await supabase.auth.signOut()
        return
      }

      const userRole = profile.role?.trim().toLowerCase()
      const accountKey = profile.email?.split("@")[0]

      if (userRole === "admin" || userRole === "administrator") {
        setRole("admin")
      } else if (userRole === "professor") {
        setRole("professor")
        if (accountKey && professorProfiles[accountKey as ProfessorAccount]) {
          setProfessorAccount(accountKey as ProfessorAccount)
        }
      } else if (userRole === "student") {
        setRole("student")
        if (accountKey && studentProfiles[accountKey as StudentAccount]) {
          setStudentAccount(accountKey as StudentAccount)
        }

        const { data: studentRow } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (studentRow) {
          setDbStudent(studentRow as DbStudentProfile)
        }

        setPage("reports")
      } else {
        await supabase.auth.signOut()
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (role !== "student" || dbStudent) return

    const loadStudentRecord = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: studentRow } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (studentRow) {
        setDbStudent(studentRow as DbStudentProfile)
      }
    }

    loadStudentRecord()
  }, [role, dbStudent])

  const allowedPages: Record<UserRole, Page[]> = {
    admin: ["overview", "students", "teachers", "classes", "attendance", "reports"],
    professor: ["overview", "students", "classes", "attendance", "reports"],
    student: ["reports"],
  }

  const visibleNavigation = role
    ? navigation.filter((item) => allowedPages[role].includes(item.id))
    : []

  const pageTitle =
    page === "reports" && role === "student"
      ? "Attendance Reports"
      : navigation.find((item) => item.id === page)?.label || "Overview"

  if (!role) {
    return (
      <LoginPage
        onLogin={(
          selectedRole: UserRole,
          selectedProfessor?: ProfessorAccount,
          selectedStudent?: StudentAccount
        ) => {
          setRole(selectedRole)

          if (selectedProfessor && professorProfiles[selectedProfessor]) {
            setProfessorAccount(selectedProfessor)
          }

          if (selectedStudent) {
            if (
              typeof selectedStudent === "string" &&
              studentProfiles[selectedStudent]
            ) {
              setStudentAccount(selectedStudent)
              setDbStudent(null)
            } else if (typeof selectedStudent === "object") {
              setDbStudent(selectedStudent as unknown as DbStudentProfile)
            }
          }

          setPage(selectedRole === "student" ? "reports" : "overview")
          setSelectedStudentId(null)
        }}
      />
    )
  }

  const studentYearNum = String(dbStudent?.year_level ?? "").replace(/\D/g, "")
  const resolvedStudentYear = studentYearNum || "3"
  const studentShortProgram = dbStudent
    ? `${formatProgramShort(dbStudent.program)}${studentYearNum ? ` ${studentYearNum}` : ""}`
    : "BSCS 3"

  const resolvedStudentProfile = dbStudent
    ? {
        title: "Student",
        name: dbStudent.full_name,
        initials: getInitials(dbStudent.full_name),
        program: `${formatProgramFull(dbStudent.program)} · ${studentShortProgram}`,
        studentId: dbStudent.student_number || String(dbStudent.id),
      }
    : studentProfiles[studentAccount]

  const profile =
    role === "professor"
      ? professorProfiles[professorAccount]
      : role === "student"
        ? resolvedStudentProfile
        : roleProfiles[role]

  const assignedProfessorSchedule =
    role === "professor"
      ? adminClassSchedule.filter(
          (course) =>
            (teacherNameOverrides[course.instructor] || course.instructor) ===
            profile.name
        )
      : []

  const assignedProfessorCourses =
    role === "professor"
      ? (assignedProfessorSchedule.map((course) => ({
          ...courseSections[0],
          code: course.code,
          title: course.title,
          section: course.section,
          instructor: profile.name,
          year: course.year,
          attendance: {
            ...courseSections[0].attendance,
            classType: course.title.includes("LAB")
              ? "Laboratory"
              : "Lecture",
            scheduled: 0,
            present: 0,
            late: 0,
            absent: 0,
            absenceHours: 0,
          },
        })) as unknown as typeof courseSections)
      : []

  const studentYearCourses: typeof courseSections =
    role === "student"
      ? (adminClassSchedule
          .filter((course) => String(course.year) === resolvedStudentYear)
          .map((course) => ({
            ...courseSections[0],
            code: course.code,
            title: course.title,
            section: course.section,
            instructor: course.instructor,
            year: course.year,
            attendance: {
              ...courseSections[0].attendance,
              classType: course.title.includes("LAB")
                ? "Laboratory"
                : "Lecture",
              scheduled: 0,
              present: 0,
              late: 0,
              absent: 0,
              absenceHours: 0,
            },
          })) as unknown as typeof courseSections)
      : courseSections

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        {/* SIDEBAR BRAND / OFFICIAL OLOPSC LOGO */}
        <div className="brand">
          <img
            className="brand-logo"
            src="https://www.olopsc.edu.ph/OLOPSC%20_BMSE_Official_Logo.webp"
            alt="OLOPSC Official Logo"
          />

          <span>
            COLLEGE OF BUSINESS, MANAGEMENT, SCIENCE AND EDUCATION
            <small>Attendance portal</small>
          </span>
        </div>

        <nav aria-label="Main navigation">
          <span className="nav-label">Workspace</span>

          {visibleNavigation.map((item) => (
            <button
              className={page === item.id ? "active" : ""}
              key={item.id}
              onClick={() => {
                setPage(item.id)
                setMobileNav(false)
              }}
              type="button"
            >
              <Icon name={item.icon} size={19} />{" "}
              {item.id === "reports" && role === "student"
                ? "Attendance Reports"
                : item.label}

              {item.id === "students" && (
                <span className="nav-count">66</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signOut()

              if (error) {
                console.error("Sign out failed:", error.message)
                return
              }

              setRole(null)
              setDbStudent(null)
              setSelectedStudentId(null)
              setPage("overview")
              setMobileNav(false)
            }}
            type="button"
          >
            <Icon name="logout" size={19} /> Sign out
          </button>

          <div className="profile">
            <span className="avatar admin-avatar">
              {profile.initials}
            </span>

            <span>
              <strong>{profile.name}</strong>
              <small>
                {role === "student"
                  ? `${studentShortProgram} · Student`
                  : profile.title}
              </small>
            </span>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          aria-label="Close navigation"
          className="nav-overlay"
          onClick={() => setMobileNav(false)}
          type="button"
        />
      )}

      <main>
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="menu-button"
            onClick={() => setMobileNav(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>

          <div>
            <span className="breadcrumb">
              College of Business, Management, Science and Education ·{" "}
              {profile.title} Portal
            </span>

            <h1>{pageTitle}</h1>
          </div>

          <div className="header-actions">
            <span className="header-avatar">{profile.initials}</span>
          </div>
        </header>

        <div className="content">
          {page === "overview" && (
            <Overview
              setPage={setPage}
              userName={profile.name}
              role={role}
              professorCourses={assignedProfessorCourses}
            />
          )}

          {page === "students" && role === "admin" && (
            <AdminStudentRegistry />
          )}

          {page === "students" && role === "professor" && (
            <ProfessorStudentDirectory />
          )}

          {page === "teachers" && role === "admin" && (
            <AdminTeacherDirectory />
          )}

          {page === "teachers" && role !== "admin" && (
            <DirectoryPage type="teachers" />
          )}

          {page === "classes" && role === "admin" && (
            <AdminClassSchedule />
          )}

          {page === "classes" && role === "professor" && (
            <ProfessorClasses professorName={profile.name} />
          )}

          {page === "attendance" && role === "admin" && (
            <AdminAttendanceOverview />
          )}

          {page === "attendance" && role !== "admin" && (
            <AttendancePage courses={assignedProfessorSchedule} />
          )}

          {page === "reports" && role === "admin" && (
            <AdminReportsOverview />
          )}

          {page === "reports" && role !== "admin" && (
            <ReportsPage
              role={role}
              profile={profile}
              courses={
                role === "professor"
                  ? assignedProfessorCourses
                  : studentYearCourses
              }
              studentId={
                role === "student"
                  ? resolvedStudentProfile.studentId
                  : undefined
              }
              onViewStudent={(studentId) => {
                if (role === "student") return

                setSelectedStudentId(studentId)
                setPage("students")
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}