import { useEffect, useState } from "react"
import {
  Page,
  courseSections,
  academicYearSummary,
} from "@/features/shared/data"
import { UserRole } from "@/types"
import { Icon } from "@/components/Icon"
import type { IconName } from "@/components/Icon"
import { Button } from "@/components"
import { supabase } from "@/lib/supabase"

interface WeeklyDayStat {
  short: string
  full: string
  date: string
  present: number
  weightedPresent: number
  total: number
  percentage: number
}

const DEFAULT_WEEK_DAYS: WeeklyDayStat[] = [
  { short: "Mon", full: "Monday", date: "", present: 0, weightedPresent: 0, total: 0, percentage: 0 },
  { short: "Tue", full: "Tuesday", date: "", present: 0, weightedPresent: 0, total: 0, percentage: 0 },
  { short: "Wed", full: "Wednesday", date: "", present: 0, weightedPresent: 0, total: 0, percentage: 0 },
  { short: "Thu", full: "Thursday", date: "", present: 0, weightedPresent: 0, total: 0, percentage: 0 },
  { short: "Fri", full: "Friday", date: "", present: 0, weightedPresent: 0, total: 0, percentage: 0 },
]

function getManilaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(date)
}

function getManilaWeekDates(todayStr: string) {
  const baseDate = new Date(`${todayStr}T12:00:00Z`)
  const dayOfWeek = baseDate.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const labels = [
    { short: "Mon", full: "Monday" },
    { short: "Tue", full: "Tuesday" },
    { short: "Wed", full: "Wednesday" },
    { short: "Thu", full: "Thursday" },
    { short: "Fri", full: "Friday" },
    { short: "Sat", full: "Saturday" },
  ]

  return labels.map((label, index) => {
    const d = new Date(baseDate)
    d.setUTCDate(baseDate.getUTCDate() + diffToMonday + index)
    return {
      ...label,
      date: d.toISOString().slice(0, 10),
    }
  })
}

// Rounds proportional Present / Late / Absent weights so their sum
// always equals the exact number of unique recorded students (<= totalStudents)
function distributeRoundedCounts(
  presentWeight: number,
  lateWeight: number,
  absentWeight: number,
  totalRecordedStudents: number,
) {
  const items = [
    { key: "present" as const, value: presentWeight, floor: Math.floor(presentWeight) },
    { key: "late" as const, value: lateWeight, floor: Math.floor(lateWeight) },
    { key: "absent" as const, value: absentWeight, floor: Math.floor(absentWeight) },
  ]

  let remainder = Math.max(
    0,
    totalRecordedStudents - items.reduce((sum, item) => sum + item.floor, 0),
  )

  const sortedByFraction = [...items].sort(
    (a, b) => b.value - b.floor - (a.value - a.floor),
  )

  for (let i = 0; i < sortedByFraction.length && remainder > 0; i += 1) {
    sortedByFraction[i].floor += 1
    remainder -= 1
  }

  return {
    present: items.find((i) => i.key === "present")?.floor ?? 0,
    late: items.find((i) => i.key === "late")?.floor ?? 0,
    absent: items.find((i) => i.key === "absent")?.floor ?? 0,
  }
}

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
  // ============================================
  // REAL-TIME PHILIPPINE / MANILA DATE AND TIME
  // ============================================
  const [currentDateTime, setCurrentDateTime] = useState(
    new Date(),
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const manilaDate = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(currentDateTime)

  const manilaTime = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentDateTime)

  // ============================================
  // DASHBOARD METRICS
  // ============================================
  const [totalStudents, setTotalStudents] = useState(0)
  const [presentToday, setPresentToday] = useState(0)
  const [absentToday, setAbsentToday] = useState(0)
  const [lateToday, setLateToday] = useState(0)
  const [todayAttendanceRate, setTodayAttendanceRate] = useState(0)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyDayStat[]>(
    DEFAULT_WEEK_DAYS,
  )

  const [metricsLoading, setMetricsLoading] = useState(true)

  // ============================================
  // LOAD DATA FROM SUPABASE
  // ============================================
  useEffect(() => {
    let isMounted = true

    async function loadDashboardMetrics() {
      try {
        setMetricsLoading(true)

        const today = getManilaDateString(new Date())
        const weekDays = getManilaWeekDates(today)
        const mondayDate = weekDays[0].date
        const saturdayDate = weekDays[weekDays.length - 1].date

        // ============================================
        // TOTAL ACTIVE STUDENTS
        // ============================================
        const {
          data: activeStudentsData,
          error: studentsError,
        } = await supabase
          .from("students")
          .select("id")
          .eq("status", "Active")

        const activeStudentIds = new Set<string>()
        if (studentsError) {
          console.error(
            "Error loading students:",
            studentsError,
          )
        } else if (isMounted) {
          ;(activeStudentsData ?? []).forEach((student) => {
            if (student.id) {
              activeStudentIds.add(String(student.id))
            }
          })
          setTotalStudents(activeStudentIds.size)
        }

        const activeCount = activeStudentIds.size

        // ============================================
        // TODAY'S ATTENDANCE ONLY (WEIGHTED BY SUBJECTS
        // PER UNIQUE STUDENT SO PARTIAL ATTENDANCE IS
        // ACCURATELY REFLECTED WITHOUT EXCEEDING 66)
        // ============================================
        const {
          data: attendanceData,
          error: attendanceError,
        } = await supabase
          .from("attendance")
          .select("student_id, course_code, date, status")
          .eq("date", today)

        if (attendanceError) {
          console.error(
            "Error loading attendance:",
            attendanceError,
          )
        } else if (isMounted) {
          const assignedCodes = new Set(
            professorCourses.map((course) =>
              course.code.trim().toUpperCase(),
            ),
          )

          // Deduplicate exact (student_id, course_code, date) entries first
          const uniqueSubjectMarksToday = Array.from(
            new Map(
              (attendanceData ?? [])
                .filter((record) => {
                  const recordDate = String(record.date ?? "").slice(0, 10)
                  if (recordDate !== today) return false

                  const studentKey = String(record.student_id ?? "").trim()
                  if (!studentKey) return false
                  if (activeCount > 0 && !activeStudentIds.has(studentKey)) {
                    return false
                  }

                  if (role === "professor" && assignedCodes.size > 0) {
                    const code = String(record.course_code ?? "")
                      .trim()
                      .toUpperCase()
                    return assignedCodes.has(code)
                  }

                  return true
                })
                .map((record) => [
                  `${String(record.student_id).trim()}-${String(record.course_code ?? "").trim().toUpperCase()}-${today}`,
                  record,
                ]),
            ).values(),
          )

          // Group each student's subject statuses for today
          const subjectsByStudent = new Map<
            string,
            { present: number; late: number; absent: number }
          >()

          uniqueSubjectMarksToday.forEach((record) => {
            const studentKey = String(record.student_id ?? "").trim()
            const status = String(record.status ?? "").trim()
            const current = subjectsByStudent.get(studentKey) ?? {
              present: 0,
              late: 0,
              absent: 0,
            }

            if (status === "Present") current.present += 1
            else if (status === "Late") current.late += 1
            else if (status === "Absent") current.absent += 1

            subjectsByStudent.set(studentKey, current)
          })

          let presentWeight = 0
          let lateWeight = 0
          let absentWeight = 0

          subjectsByStudent.forEach((counts) => {
            const totalSubjectsToday =
              counts.present + counts.late + counts.absent
            if (totalSubjectsToday <= 0) return

            presentWeight += counts.present / totalSubjectsToday
            lateWeight += counts.late / totalSubjectsToday
            absentWeight += counts.absent / totalSubjectsToday
          })

          const distributed = distributeRoundedCounts(
            presentWeight,
            lateWeight,
            absentWeight,
            subjectsByStudent.size,
          )

          setPresentToday(distributed.present)
          setLateToday(distributed.late)
          setAbsentToday(distributed.absent)
          setTodayAttendanceRate(
            activeCount > 0
              ? Math.min(
                  100,
                  Math.round((presentWeight / activeCount) * 100),
                )
              : 0,
          )
        }

        // ============================================
        // WEEKLY ATTENDANCE (MON - SAT, WEIGHTED PER
        // UNIQUE ACTIVE STUDENT ACROSS THEIR SUBJECTS)
        // ============================================
        const {
          data: weeklyData,
          error: weeklyError,
        } = await supabase
          .from("attendance")
          .select("student_id, course_code, date, status")
          .gte("date", mondayDate)
          .lte("date", saturdayDate)

        if (weeklyError) {
          console.error(
            "Error loading weekly attendance:",
            weeklyError,
          )
        } else if (isMounted) {
          const uniqueWeeklyMarks = Array.from(
            new Map(
              (weeklyData ?? [])
                .filter((record) => {
                  const studentKey = String(record.student_id ?? "").trim()
                  if (!studentKey) return false
                  if (activeCount > 0 && !activeStudentIds.has(studentKey)) {
                    return false
                  }
                  return true
                })
                .map((record) => [
                  `${String(record.student_id).trim()}-${String(record.course_code ?? "").trim().toUpperCase()}-${String(record.date ?? "").slice(0, 10)}`,
                  record,
                ]),
            ).values(),
          )

          const computedDays: WeeklyDayStat[] = weekDays.map((day) => {
            const dayMarks = uniqueWeeklyMarks.filter(
              (record) => String(record.date ?? "").slice(0, 10) === day.date,
            )

            const perStudent = new Map<
              string,
              { attended: number; total: number }
            >()

            dayMarks.forEach((record) => {
              const studentKey = String(record.student_id ?? "").trim()
              const status = String(record.status ?? "").trim()
              const entry = perStudent.get(studentKey) ?? {
                attended: 0,
                total: 0,
              }

              entry.total += 1
              if (status === "Present" || status === "Late") {
                entry.attended += 1
              }

              perStudent.set(studentKey, entry)
            })

            let weightedPresent = 0
            perStudent.forEach((entry) => {
              if (entry.total > 0) {
                weightedPresent += entry.attended / entry.total
              }
            })

            const total = perStudent.size
            const present = Math.round(weightedPresent)
            const percentage =
              total > 0
                ? Math.min(100, Math.round((weightedPresent / total) * 100))
                : 0

            return {
              short: day.short,
              full: day.full,
              date: day.date,
              present,
              weightedPresent,
              total,
              percentage,
            }
          })

          const visibleDays = computedDays.filter(
            (day, idx) => idx < 5 || day.total > 0,
          )

          setWeeklyStats(visibleDays)
        }
      } catch (error) {
        console.error(
          "Failed to load dashboard metrics:",
          error,
        )
      } finally {
        if (isMounted) {
          setMetricsLoading(false)
        }
      }
    }

    loadDashboardMetrics()

    const channel = supabase
      .channel("overview-live-attendance")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        () => {
          loadDashboardMetrics()
        },
      )
      .subscribe()

    const refreshTimer = setInterval(
      loadDashboardMetrics,
      30000,
    )

    return () => {
      isMounted = false
      clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [role, professorCourses])

  // ============================================
  // WEEKLY TOTALS
  // ============================================
  const weeklyPresentTotal = weeklyStats.reduce(
    (sum, day) => sum + day.present,
    0,
  )
  const weeklyWeightedTotal = weeklyStats.reduce(
    (sum, day) => sum + day.weightedPresent,
    0,
  )
  const weeklyMarksTotal = weeklyStats.reduce(
    (sum, day) => sum + day.total,
    0,
  )
  const weeklyOverallRate =
    weeklyMarksTotal > 0
      ? Number(
          ((weeklyWeightedTotal / weeklyMarksTotal) * 100).toFixed(1),
        )
      : 0

  // ============================================
  // DASHBOARD METRICS
  // ============================================
  const metrics = [
    {
      label: "Total students",
      value: metricsLoading
        ? "..."
        : String(totalStudents),
      detail:
        role === "admin"
          ? "Active students"
          : `${totalStudents} active students`,
      icon: "students",
      tone: "blue",
    },
    {
      label: "Present today",
      value: metricsLoading
        ? "..."
        : String(presentToday),
      detail: `${todayAttendanceRate}% present today`,
      icon: "check",
      tone: "green",
    },
    {
      label: "Absent today",
      value: metricsLoading
        ? "..."
        : String(absentToday),
      detail: "Requires follow-up",
      icon: "alert",
      tone: "red",
    },
    {
      label: "Late today",
      value: metricsLoading
        ? "..."
        : String(lateToday),
      detail: "Arrived late",
      icon: "clock",
      tone: "amber",
    },
  ] as const

  return (
    <>
      {/* ============================================
          WELCOME CARD
          ============================================ */}
      <section className="welcome-card">
        <div>
          <span className="eyebrow">
            {manilaDate} · {manilaTime}
          </span>

          <h2>Good morning, {userName}</h2>

          <p>
            Here’s what’s happening across your school today.
          </p>
        </div>

        {role === "professor" && (
          <Button
            className="primary"
            onClick={() => setPage("attendance")}
          >
            <Icon name="calendar" size={18} />
            Take attendance
          </Button>
        )}
      </section>

      {/* ============================================
          ATTENDANCE SUMMARY
          ============================================ */}
      <section
        aria-label="Attendance summary"
        className="metric-grid"
      >
        {metrics.map((metric) => (
          <article
            className="metric-card"
            key={metric.label}
          >
            <div className={`metric-icon ${metric.tone}`}>
              <Icon name={metric.icon} size={22} />
            </div>

            <span>{metric.label}</span>

            <strong>{metric.value}</strong>

            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      {/* ============================================
          WEEKLY ATTENDANCE
          ============================================ */}
      <div className="dashboard-grid overview-chart-grid">
        {role === "admin" && (
          <section className="panel attendance-chart">
            <div className="panel-heading">
              <div>
                <h3>Weekly attendance</h3>

                <p>
                  Daily attendance rate for all classes
                </p>
              </div>

              <span className="period">
                This week
              </span>
            </div>

            <div className="chart-summary">
              <strong>{weeklyOverallRate}%</strong>

              <span>
                {weeklyPresentTotal} of {weeklyMarksTotal} weekly attendance marks present
              </span>
            </div>

            <div
              className="bar-chart"
              aria-label="Weekly attendance chart"
            >
              {weeklyStats.map((day) => (
                <div
                  className="bar-column"
                  key={day.short}
                >
                  <span className="bar-value">
                    {day.present} of {day.total}
                  </span>

                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${day.percentage}%`,
                      }}
                    />
                  </div>

                  <small>{day.short}</small>
                </div>
              ))}
            </div>

            <div
              className="weekly-legend"
              aria-label="Weekly attendance legend"
            >
              {weeklyStats.map((day) => (
                <span key={day.full}>
                  <i />

                  <b>{day.full}</b>

                  <small>
                    {day.present} present · {day.percentage}%
                  </small>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ============================================
          QUICK ACTIONS
          ============================================ */}
      <section className="panel quick-panel">
        <div className="panel-heading">
          <div>
            <h3>Quick actions</h3>

            <p>
              Common tasks, one click away
            </p>
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
            [
              "chart",
              "View reports",
              "Explore attendance insights",
              "reports",
            ],
          ]
            .filter(
              ([, , , page]) =>
                (role !== "professor" ||
                  page !== "students") &&
                (role !== "admin" ||
                  page !== "attendance"),
            )
            .map(
              ([
                icon,
                title,
                detail,
                page,
              ]) => (
                <Button
                  className="quick-action"
                  key={title}
                  onClick={() =>
                    setPage(page as Page)
                  }
                >
                  <span className="quick-icon">
                    <Icon
                      name={icon as IconName}
                    />
                  </span>

                  <span>
                    <strong>{title}</strong>

                    <small>{detail}</small>
                  </span>

                  <Icon
                    name="chevron"
                    size={18}
                  />
                </Button>
              ),
            )}
        </div>
      </section>

      {/* ============================================
          PROFESSOR COURSES
          ============================================ */}
      {role === "professor" && (
        <section className="panel professor-courses">
          <div className="panel-heading">
            <div>
              <h3>Assigned class schedule</h3>

              <p>
                Courses assigned to {userName}
              </p>
            </div>

            <Button
              className="text-button"
              onClick={() => setPage("classes")}
            >
              View schedule
              <Icon name="chevron" size={16} />
            </Button>
          </div>

          <div className="professor-course-grid">
            {professorCourses.map((course) => (
              <article
                className="professor-course-card"
                key={course.code}
              >
                <span>{course.code}</span>

                <div>
                  <strong>{course.title}</strong>

                  <small>
                    {course.section} ·{" "}
                    {course.students} students
                  </small>
                </div>

                <Icon
                  name="chevron"
                  size={17}
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ============================================
          ADMIN DATA
          ============================================ */}
      {role === "admin" && (
        <section className="panel admin-data-overview">
          <div className="panel-heading">
            <div>
              <h3>Connected academic data</h3>

              <p>
                Uploaded enrollment and schedule
                information across all modules
              </p>
            </div>

            <span className="sync-status">
              <Icon name="check" size={14} />
              Synced
            </span>
          </div>

          <div className="admin-module-grid">
            {[
              [
                "students",
                "Students",
                String(totalStudents),
                "Active students",
                "students",
              ],
              [
                "teachers",
                "Teachers",
                "8",
                "Faculty records",
                "teachers",
              ],
              [
                "book",
                "Class Schedule",
                "35",
                "Scheduled subjects",
                "classes",
              ],
              [
                "calendar",
                "Attendance",
                `${todayAttendanceRate}%`,
                "Current attendance",
                "attendance",
              ],
              [
                "chart",
                "Reports",
                "4",
                "Year-level summaries",
                "reports",
              ],
            ].map(
              ([
                icon,
                label,
                value,
                detail,
                page,
              ]) => (
                <button
                  className="admin-module-card"
                  key={label}
                  onClick={() =>
                    setPage(page as Page)
                  }
                  type="button"
                >
                  <span>
                    <Icon
                      name={icon as IconName}
                      size={19}
                    />
                  </span>

                  <strong>{value}</strong>

                  <b>{label}</b>

                  <small>{detail}</small>

                  <Icon
                    name="chevron"
                    size={15}
                  />
                </button>
              ),
            )}
          </div>

          <div className="admin-year-strip">
            {academicYearSummary.map(
              (summary) => (
                <span key={summary.year}>
                  <b>
                    Year {summary.year}
                  </b>

                  <strong>
                    {summary.students} students
                  </strong>

                  <small>
                    {summary.subjects} subjects ·{" "}
                    {summary.units} units
                  </small>
                </span>
              ),
            )}
          </div>
        </section>
      )}

      {/* ============================================
          DATA NOTICE
          ============================================ */}
      <p className="sample-note">
        {role === "admin"
          ? "Dashboard attendance figures are connected to your Supabase records."
          : "Attendance figures are connected to your Supabase records."}
      </p>
    </>
  )
}