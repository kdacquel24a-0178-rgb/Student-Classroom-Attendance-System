import {
  Page,
  courseSections,
  students,
  academicYearSummary,
} from "@/features/shared/data"
import { UserRole } from "@/types"
import { Icon } from "@/components/Icon"
import type { IconName } from "@/components/Icon"
import { Button } from "@/components"

export function Overview({
  setPage,
  userName,
  role,
  professorCourses = [],
}: {
  setPage: (page: Page) => void
  userName: string
  role: UserRole
  professorCourses?: typeof courseSections
}) {
  const metrics = [
    {
      label: "Total students",
      value: role === "admin" ? "46" : "5",
      detail: role === "admin" ? "Across Years 1–4" : "BSCS3A students",
      icon: "students",
      tone: "blue",
    },
    {
      label: "Present today",
      value: role === "admin" ? "42" : "3",
      detail: role === "admin" ? "91.3% present today" : "60% present today",
      icon: "check",
      tone: "green",
    },
    {
      label: "Absent today",
      value: role === "admin" ? "3" : "1",
      detail:
        role === "admin" ? "Across all year levels" : "Requires follow-up",
      icon: "alert",
      tone: "red",
    },
    {
      label: "Late today",
      value: "1",
      detail: "Arrived after 8:15",
      icon: "clock",
      tone: "amber",
    },
  ] as const
  return (
    <>
      <section className="welcome-card">
        <div>
          <span className="eyebrow">Wednesday, October 21</span>
          <h2>Good morning, {userName}</h2>
          <p>Here’s what’s happening across your school today.</p>
        </div>
        {role === "professor" && (
          <Button className="primary" onClick={() => setPage("attendance")}>
            <Icon name="calendar" size={18} /> Take attendance
          </Button>
        )}
      </section>

      <section aria-label="Attendance summary" className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className={`metric-icon ${metric.tone}`}>
              <Icon name={metric.icon} size={22} />
            </div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-grid overview-chart-grid">
        {role === "admin" && (
          <section className="panel attendance-chart">
            <div className="panel-heading">
              <div>
                <h3>Weekly attendance</h3>
                <p>Daily attendance rate for all classes</p>
              </div>
              <span className="period">This week</span>
            </div>
            <div className="chart-summary">
              <strong>91.3%</strong>
              <span>210 of 230 weekly attendance marks present</span>
            </div>
            <div className="bar-chart" aria-label="Weekly attendance chart">
              {[87, 93, 91, 96, 89].map((height, index) => (
                <div className="bar-column" key={index}>
                  <span className="bar-value">
                    {[40, 43, 42, 44, 41][index]} of 46
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <small>{["Mon", "Tue", "Wed", "Thu", "Fri"][index]}</small>
                </div>
              ))}
            </div>
            {role === "admin" && (
              <div
                className="weekly-legend"
                aria-label="Weekly attendance legend"
              >
                {[
                  ["Monday", 40, 87],
                  ["Tuesday", 43, 93],
                  ["Wednesday", 42, 91],
                  ["Thursday", 44, 96],
                  ["Friday", 41, 89],
                ].map(([day, present, percentage]) => (
                  <span key={day}>
                    <i />
                    <b>{day}</b>
                    <small>
                      {present} present · {percentage}%
                    </small>
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <section className="panel quick-panel">
        <div className="panel-heading">
          <div>
            <h3>Quick actions</h3>
            <p>Common tasks, one click away</p>
          </div>
        </div>
        <div className="quick-grid">
          {[
            [
              "students",
              "Add a student",
              "Create a new student record",
              "students",
            ],
            [
              "book",
              "View class schedule",
              "Review classes and assignments",
              "classes",
            ],
            [
              "calendar",
              "Take attendance",
              "Mark today’s attendance",
              "attendance",
            ],
            ["chart", "View reports", "Explore attendance insights", "reports"],
          ]
            .filter(
              ([, , , page]) =>
                (role !== "professor" || page !== "students") &&
                (role !== "admin" || page !== "attendance"),
            )
            .map(([icon, title, detail, page]) => (
              <Button
                className="quick-action"
                key={title}
                onClick={() => setPage(page as Page)}
              >
                <span className="quick-icon">
                  <Icon name={icon as IconName} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <Icon name="chevron" size={18} />
              </Button>
            ))}
        </div>
      </section>
      {role === "professor" && (
        <section className="panel professor-courses">
          <div className="panel-heading">
            <div>
              <h3>Assigned class schedule</h3>
              <p>Courses assigned to {userName}</p>
            </div>
            <Button className="text-button" onClick={() => setPage("classes")}>
              View schedule <Icon name="chevron" size={16} />
            </Button>
          </div>
          <div className="professor-course-grid">
            {professorCourses.map((course) => (
              <article className="professor-course-card" key={course.code}>
                <span>{course.code}</span>
                <div>
                  <strong>{course.title}</strong>
                  <small>
                    {course.section} · {course.students} students
                  </small>
                </div>
                <Icon name="chevron" size={17} />
              </article>
            ))}
          </div>
        </section>
      )}
      {role === "admin" && (
        <section className="panel admin-data-overview">
          <div className="panel-heading">
            <div>
              <h3>Connected academic data</h3>
              <p>
                Uploaded enrollment and schedule information across all modules
              </p>
            </div>
            <span className="sync-status">
              <Icon name="check" size={14} /> Synced
            </span>
          </div>
          <div className="admin-module-grid">
            {[
              ["students", "Students", "46", "Years 1–4", "students"],
              ["teachers", "Teachers", "8", "Faculty records", "teachers"],
              ["book", "Class Schedule", "35", "Scheduled subjects", "classes"],
              [
                "calendar",
                "Attendance",
                "91.3%",
                "Current average",
                "attendance",
              ],
              ["chart", "Reports", "4", "Year-level summaries", "reports"],
            ].map(([icon, label, value, detail, page]) => (
              <button
                className="admin-module-card"
                key={label}
                onClick={() => setPage(page as Page)}
                type="button"
              >
                <span>
                  <Icon name={icon as IconName} size={19} />
                </span>
                <strong>{value}</strong>
                <b>{label}</b>
                <small>{detail}</small>
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
          <div className="admin-year-strip">
            {academicYearSummary.map((summary) => (
              <span key={summary.year}>
                <b>Year {summary.year}</b>
                <strong>{summary.students} students</strong>
                <small>
                  {summary.subjects} subjects · {summary.units} units
                </small>
              </span>
            ))}
          </div>
        </section>
      )}
      <p className="sample-note">
        {role === "admin"
          ? "Enrollment and schedule figures reflect the uploaded A.Y. 2026–2027 records."
          : "Dashboard figures are illustrative and do not represent actual student records."}
      </p>
    </>
  )
}
