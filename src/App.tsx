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
import collegeLogo from "@/assets/college-logo.jpg"

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [professorAccount, setProfessorAccount] = useState<ProfessorAccount>("ruby")
  const [studentAccount, setStudentAccount] = useState<StudentAccount>("marc")
  const [page, setPage] = useState<Page>("overview")
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

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
        setPage("reports")
      } else {
        await supabase.auth.signOut()
      }
    }

    restoreSession()
  }, [])

  const allowedPages: Record<UserRole, Page[]> = {
    admin: ["overview", "students", "teachers", "classes", "attendance", "reports"],
    professor: ["overview", "students", "classes", "attendance", "reports"],
    student: ["reports"],
  }
  
  const visibleNavigation = role ? navigation.filter((item) => allowedPages[role].includes(item.id)) : []
  
  const pageTitle = page === "reports" && role === "student"
      ? "Attendance Reports"
      : navigation.find((item) => item.id === page)?.label || "Overview"

  if (!role) {
    return (
      <LoginPage
        onLogin={(selectedRole: UserRole, selectedProfessor?: ProfessorAccount, selectedStudent?: StudentAccount) => {
          setRole(selectedRole)
          
          if (selectedProfessor && professorProfiles[selectedProfessor]) {
            setProfessorAccount(selectedProfessor)
          }
          if (selectedStudent && studentProfiles[selectedStudent]) {
            setStudentAccount(selectedStudent)
          }
          
          setPage(selectedRole === "student" ? "reports" : "overview")
          setSelectedStudentId(null)
        }}
      />
    )
  }

  const profile = role === "professor"
      ? professorProfiles[professorAccount]
      : role === "student"
        ? studentProfiles[studentAccount]
        : roleProfiles[role]
        
  const assignedProfessorCourses = role === "professor"
      ? courseSections.filter((course) => course.instructor === profile.name)
      : []
      
  const assignedProfessorSchedule = role === "professor"
      ? adminClassSchedule.filter(
          (course) => (teacherNameOverrides[course.instructor] || course.instructor) === profile.name
        )
      : []

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src={collegeLogo} alt="" />
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
              {item.id === "reports" && role === "student" ? "Attendance Reports" : item.label}
              {item.id === "students" && <span className="nav-count">66</span>}
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
              setSelectedStudentId(null)
              setPage("overview")
              setMobileNav(false)
            }}
            type="button"
          >
            <Icon name="logout" size={19} /> Sign out
          </button>
          <div className="profile">
            <span className="avatar admin-avatar">{profile.initials}</span>
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.program ? "BSCS 3 · Student" : profile.title}</small>
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
              College of Business, Management, Science and Education · {profile.title} Portal
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
          {page === "students" && role === "admin" && <AdminStudentRegistry />}
          {page === "students" && role === "professor" && <ProfessorStudentDirectory />}
          {page === "teachers" && role === "admin" && <AdminTeacherDirectory />}
          {page === "teachers" && role !== "admin" && <DirectoryPage type="teachers" />}
          {page === "classes" && role === "admin" && <AdminClassSchedule />}
          {page === "classes" && role === "professor" && (
            <ProfessorClasses courses={assignedProfessorSchedule} professorName={profile.name} />
          )}
          {page === "attendance" && role === "admin" && <AdminAttendanceOverview />}
          {page === "attendance" && role !== "admin" && (
            <AttendancePage courses={assignedProfessorSchedule} />
          )}
          {page === "reports" && role === "admin" && <AdminReportsOverview />}
          {page === "reports" && role !== "admin" && (
            <ReportsPage
              role={role}
              profile={profile}
              courses={role === "professor" ? assignedProfessorCourses : courseSections}
              studentId={role === "student" ? studentProfiles[studentAccount].studentId : undefined}
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