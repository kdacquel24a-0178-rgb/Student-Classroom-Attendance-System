import { Fragment, useState } from "react"
import {
  computeAttendance,
  courseSections,
  students,
  adminStudentRegistry,
  academicYearSummary,
  adminYearAttendance,
  adminClassSchedule,
  calculateSubjectStanding,
  attendanceAlerts,
  studentAttendanceHistory,
  summarizeStudentAttendance,
} from "@/features/shared/data"
import { UserRole } from "@/types"
import { Icon } from "@/components/Icon"
import type { IconName } from "@/components/Icon"
import { Button, StatusBadge } from "@/components"
import { formatDate } from "@/lib/utils"

export function AdminReportsOverview() {
  const [reportDate, setReportDate] = useState("2026-10-21")
  const [standingYear, setStandingYear] = useState(1)
  const [standingSubjectCode, setStandingSubjectCode] = useState("CC101")
  const standingCourses = adminClassSchedule.filter(
    (course) => course.year === standingYear,
  )
  const standingSubject =
    standingCourses.find((course) => course.code === standingSubjectCode) ||
    standingCourses[0]
  const adminSubjectStandings = adminStudentRegistry
    .filter((student) => student.year === standingYear)
    .map((student) => {
      const subjectIndex = adminClassSchedule.findIndex(
        (course) =>
          course.year === standingSubject?.year &&
          course.code === standingSubject?.code,
      )
      return {
        student,
        standing: calculateSubjectStanding(
          student.number,
          subjectIndex + 1,
          standingSubject?.title.includes("LAB") ? "Laboratory" : "Lecture",
        ),
      }
    })
  const passingCount = adminSubjectStandings.filter(
    (record) => record.standing.mark === "Eligible",
  ).length
  const failingCount = adminSubjectStandings.length - passingCount

  const exportAdminReport = () => {
    const rows = [
      ["ClassTrack Admin Academic Summary"],
      ["Report date", reportDate],
      ["Academic year", "2026-2027"],
      [],
      [
        "Year level",
        "Students",
        "Subjects",
        "Units",
        "Hours",
        "Present",
        "Late",
        "Absent",
        "Attendance rate",
      ],
      ...academicYearSummary.map((summary) => {
        const attendance = adminYearAttendance.find(
          (item) => item.year === summary.year,
        )
        return [
          `Year ${summary.year}`,
          String(summary.students),
          String(summary.subjects),
          String(summary.units),
          String(summary.hours),
          String(attendance?.present || 0),
          String(attendance?.late || 0),
          String(attendance?.absent || 0),
          `${attendance?.rate || 0}%`,
        ]
      }),
      [],
      ["Per-subject handbook standing"],
      ["Subject", standingSubject?.title || ""],
      [
        "Student",
        "Present",
        "Late",
        "Absent",
        "Absence hours",
        "Attendance",
        "Result",
      ],
      ...adminSubjectStandings.map(({ student, standing }) => [
        student.name,
        String(standing.present),
        String(standing.late),
        String(standing.absent),
        String(
          standing.absent * (standingSubject?.title.includes("LAB") ? 3 : 2),
        ),
        `${standing.percentage}%`,
        standing.mark,
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `ClassTrack-admin-summary-${reportDate}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <section className="panel admin-report-heading">
        <div>
          <span className="eyebrow">Connected institutional report</span>
          <h2>Academic summary</h2>
          <p>Enrollment, faculty, classes, and attendance in one report</p>
        </div>
        <div className="admin-report-actions">
          <label className="course-selector date-selector">
            <span>Report date</span>
            <div>
              <Icon name="calendar" size={18} />
              <input
                onChange={(event) => setReportDate(event.target.value)}
                type="date"
                value={reportDate}
              />
            </div>
          </label>
          <Button className="primary" onClick={exportAdminReport}>
            <Icon name="chart" size={17} /> Export summary
          </Button>
        </div>
      </section>

      <section className="admin-report-metrics">
        {[
          ["students", "66", "Students", "2 courses"],
          ["teachers", "8", "Teachers", "Faculty assignments"],
          ["book", "35", "Class Schedule", "4 year levels"],
          ["chart", "91.3%", "Attendance", "Current average"],
        ].map(([icon, value, label, detail]) => (
          <article className="panel" key={label}>
            <span>
              <Icon name={icon as IconName} size={19} />
            </span>
            <strong>{value}</strong>
            <b>{label}</b>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="panel data-panel subject-standing-panel">
        <div className="subject-standing-heading">
          <div>
            <span className="eyebrow">Handbook computation by subject</span>
            <h3>Student subject standing</h3>
            <p>
              Pass or fail status using 80% attendance, 11-hour FA, and NA rules
            </p>
          </div>
          <div className="standing-counts">
            <span className="passing">
              <b>{passingCount}</b> passing
            </span>
            <span className="failing">
              <b>{failingCount}</b> FA / NA
            </span>
          </div>
        </div>
        <div className="standing-filters">
          <label className="registry-select">
            <span>Year level</span>
            <select
              onChange={(event) => {
                const year = Number(event.target.value)
                const firstCourse = adminClassSchedule.find(
                  (course) => course.year === year,
                )
                setStandingYear(year)
                setStandingSubjectCode(firstCourse?.code || "")
              }}
              value={standingYear}
            >
              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </label>
          <label className="registry-select standing-subject-select">
            <span>Subject</span>
            <select
              onChange={(event) => setStandingSubjectCode(event.target.value)}
              value={standingSubject?.code || ""}
            >
              {standingCourses.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.code} · {course.title}
                </option>
              ))}
            </select>
          </label>
          <span className="standing-section">
            {standingSubject?.section} · {standingSubject?.instructor}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Absence hours</th>
                <th>Attendance</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {adminSubjectStandings.map(({ student, standing }) => (
                <tr key={student.id}>
                  <td>
                    <strong>{student.name}</strong>
                    <small className="course-code-label">{student.id}</small>
                  </td>
                  <td>{standing.present}</td>
                  <td>{standing.late}</td>
                  <td>{standing.absent}</td>
                  <td>
                    {standing.absent *
                      (standingSubject?.title.includes("LAB") ? 3 : 2)}{" "}
                    hours
                  </td>
                  <td>
                    <strong>{standing.percentage}%</strong>
                  </td>
                  <td>
                    <span
                      className={`policy-mark ${
                        standing.mark === "Eligible"
                          ? "mark-eligible"
                          : "mark-fa"
                      }`}
                    >
                      {standing.mark === "Eligible" ? "PASS" : standing.mark}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div>
            <h3>Year-level report</h3>
            <p>Uploaded enrollment and class schedule with attendance status</p>
          </div>
          <span className="period">A.Y. 2026–2027</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Students</th>
                <th>Subjects</th>
                <th>Units</th>
                <th>Hours</th>
                <th>Attendance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {academicYearSummary.map((summary) => {
                const attendance = adminYearAttendance.find(
                  (item) => item.year === summary.year,
                )
                return (
                  <tr key={summary.year}>
                    <td>
                      <strong>Year {summary.year}</strong>
                      <small className="course-code-label">
                        BSCS {summary.year}A
                      </small>
                    </td>
                    <td>{summary.students}</td>
                    <td>{summary.subjects}</td>
                    <td>{summary.units}</td>
                    <td>{summary.hours}</td>
                    <td>
                      <strong>{attendance?.rate}%</strong>
                    </td>
                    <td>
                      <span className="policy-mark mark-eligible">
                        Connected
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export function ReportsPage({
  role,
  profile,
  studentId,
  courses,
  onViewStudent,
}: {
  role: UserRole
  profile: {
    title: string
    name: string
    initials: string
    program?: string
  }
  studentId?: string
  courses: typeof courseSections
  onViewStudent: (studentId: string) => void
}) {
  const [reportDate, setReportDate] = useState("2026-10-21")
  const [reportCourseCode, setReportCourseCode] = useState("all")
  const [expandedDailyRecord, setExpandedDailyRecord] = useState<string | null>(
    null,
  )
  const reportCourses =
    reportCourseCode === "all"
      ? courses
      : courses.filter((course) => course.code === reportCourseCode)
  const selectedReportCourse = courses.find(
    (course) => course.code === reportCourseCode,
  )
  const reportAttendance = Number(
    (
      (reportCourses.reduce(
        (total, course) =>
          total + computeAttendance(course.attendance).attended,
        0,
      ) /
        Math.max(
          1,
          reportCourses.reduce(
            (total, course) => total + course.attendance.scheduled,
            0,
          ),
        )) *
      100
    ).toFixed(1),
  )
  const dailyPatterns = [
    { date: "2026-10-19", present: 4, late: 0, absent: 1 },
    { date: "2026-10-20", present: 5, late: 0, absent: 0 },
    { date: "2026-10-21", present: 3, late: 1, absent: 1 },
    { date: "2026-10-22", present: 4, late: 1, absent: 0 },
    { date: "2026-10-23", present: 3, late: 1, absent: 1 },
  ]
  const dailyReportRows = reportCourses.flatMap((course, courseIndex) =>
    dailyPatterns.map((day, dayIndex) => {
      const percentage = Number(
        (((day.present + day.late) / students.length) * 100).toFixed(1),
      )
      const rotation = (courseIndex + dayIndex) % students.length
      const rotatedStudents = [
        ...students.slice(rotation),
        ...students.slice(0, rotation),
      ]
      return {
        ...day,
        courseCode: course.code,
        courseTitle: course.title,
        percentage,
        result: percentage >= 80 ? "Eligible" : "FA",
        presentStudents: rotatedStudents
          .slice(0, day.present)
          .map((student) => student.name),
        lateStudents: rotatedStudents
          .slice(day.present, day.present + day.late)
          .map((student) => student.name),
        absentStudents: rotatedStudents
          .slice(day.present + day.late)
          .map((student) => student.name),
        studentStatus: rotatedStudents
          .slice(0, day.present)
          .some((student) => student.name === profile.name)
          ? "Present"
          : rotatedStudents
                .slice(day.present, day.present + day.late)
                .some((student) => student.name === profile.name)
            ? "Late"
            : "Absent",
      }
    }),
  )
  const standingStudents =
    role === "student"
      ? students.filter((student) => student.name === profile.name)
      : students
  const subjectStandingRows = reportCourses.flatMap((course) => {
    const courseIndex = courseSections.findIndex(
      (item) => item.code === course.code,
    )
    return standingStudents.map((student) => {
      const studentIndex = students.findIndex((item) => item.id === student.id)
      return {
        student,
        course,
        standing: calculateSubjectStanding(
          studentIndex + 1,
          courseIndex + 1,
          course.attendance.classType === "Laboratory"
            ? "Laboratory"
            : "Lecture",
        ),
      }
    })
  })
  const connectedSubjectAlerts =
    role === "student"
      ? subjectStandingRows
          .filter(
            ({ standing }) =>
              standing.mark !== "Eligible" || standing.percentage < 85,
          )
          .map(({ student, course, standing }) => ({
            studentId: student.id,
            studentName: student.name,
            initials: student.initials,
            courseCode: course.code,
            subject: course.title,
            percentage: standing.percentage,
            status:
              standing.mark === "Eligible"
                ? "At risk"
                : standing.mark === "FA"
                  ? "Failed (FA)"
                  : "No Attendance (NA)",
          }))
      : attendanceAlerts.filter((alert) =>
          courses.some((course) => course.code === alert.courseCode),
        )
  const studentHistory = studentId
    ? studentAttendanceHistory[studentId] || []
    : []
  const studentSummary = studentId
    ? summarizeStudentAttendance(studentHistory)
    : null
  const studentAbsences = studentHistory.filter(
    (entry) => entry.status === "Absent",
  ).length
  const reportCards =
    role === "student" && studentSummary
      ? [
          [
            "Overall attendance",
            `${studentSummary.percentage}%`,
            "80% minimum required",
          ],
          [
            "Handbook result",
            studentSummary.mark,
            studentSummary.mark === "FA"
              ? "Failed due to absences"
              : "Eligible for course credit",
          ],
          [
            "Recorded absences",
            String(studentAbsences),
            `${studentSummary.attended} of ${studentHistory.length} meetings attended`,
          ],
        ]
      : [
          [
            "Overall attendance",
            `${reportAttendance}%`,
            "80% minimum required",
          ],
          ["Perfect attendance", "18", "students"],
          ["At-risk students", "3", "require follow-up"],
        ]

  const exportSummaryReport = () => {
    const rows = [
      [
        "College of Business, Management, Science and Education Attendance Summary Report",
      ],
      ["Generated", new Date().toLocaleString()],
      ["Report date", reportDate],
      ["Subject", selectedReportCourse?.title || "All assigned subjects"],
      ["Portal", profile.title],
      ["Account", profile.name],
      ...(role === "student"
        ? [
            ["Student ID", studentId || ""],
            ["Program", profile.program || ""],
            ["Section", "BSCS3A"],
          ]
        : []),
      [],
      ["Summary"],
      [
        "Overall attendance",
        `${
          role === "student" && studentSummary
            ? studentSummary.percentage
            : reportAttendance
        }%`,
      ],
      ...(role === "student" && studentSummary
        ? [
            ["Handbook result", studentSummary.mark],
            ["Recorded absences", String(studentAbsences)],
          ]
        : []),
      ["Perfect attendance", "18 students"],
      ["At-risk students", "3 students"],
      [],
      [
        "Course",
        "Section",
        "Class type",
        "Scheduled",
        "Present",
        "Late",
        "Absent",
        "Absence hours",
        "Attendance",
        "Handbook mark",
        "Attendance grade points",
      ],
      ...reportCourses.map((course) => {
        const result = computeAttendance(course.attendance)
        return [
          course.title,
          course.section,
          course.attendance.classType,
          String(course.attendance.scheduled),
          String(course.attendance.present),
          String(course.attendance.late),
          String(course.attendance.absent),
          String(course.attendance.absenceHours),
          `${result.percentage}%`,
          result.mark,
          `${result.gradePoints}/${result.gradeWeight}`,
        ]
      }),
      [],
      [
        "Per-subject student standing",
        "Student",
        "Present",
        "Late",
        "Absent",
        "Absence hours",
        "Attendance",
        "Result",
      ],
      ...subjectStandingRows.map(({ student, course, standing }) => [
        course.title,
        student.name,
        String(standing.present),
        String(standing.late),
        String(standing.absent),
        String(
          standing.absent *
            (course.attendance.classType === "Laboratory" ? 3 : 2),
        ),
        `${standing.percentage}%`,
        standing.mark,
      ]),
      ...(role === "student"
        ? [
            [],
            ["Student daily attendance", "Date", "Status", "Attendance credit"],
            ...dailyReportRows.map((row) => [
              row.courseTitle,
              row.date,
              row.studentStatus,
              row.studentStatus === "Absent" ? "Not attended" : "Attended",
            ]),
          ]
        : [
            [],
            [
              "Daily attendance details",
              "Date",
              "Present",
              "Late",
              "Absent",
              "Percentage",
              "Result",
              "Present students",
              "Late students",
              "Absent students",
            ],
            ...dailyReportRows.map((row) => [
              row.courseTitle,
              row.date,
              String(row.present),
              String(row.late),
              String(row.absent),
              `${row.percentage}%`,
              row.result,
              row.presentStudents.join("; "),
              row.lateStudents.join("; "),
              row.absentStudents.join("; "),
            ]),
          ]),
    ]
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n")
    const downloadUrl = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = `CBMSE-${reportCourseCode}-${reportDate}-${role}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <>
      {role === "student" && (
        <section className="student-profile-banner">
          <span className="student-profile-avatar">{profile.initials}</span>
          <div>
            <span>Student attendance record</span>
            <h2>{profile.name}</h2>
            <p>{profile.program}</p>
          </div>
          <StatusBadge>
            {studentSummary?.mark === "FA" ? "Failed" : "Active"}
          </StatusBadge>
        </section>
      )}
      <section className="panel subject-alert-report">
        <div className="panel-heading">
          <div>
            <h3>
              {role === "student"
                ? "My subject attendance alerts"
                : "Subject attendance alerts"}
            </h3>
            <p>
              {role === "student"
                ? "Your attendance warnings by subject"
                : "Connected student warnings for available subjects"}
            </p>
          </div>
          <span className="alert-count">{connectedSubjectAlerts.length}</span>
        </div>
        {connectedSubjectAlerts.length ? (
          <div className="subject-alert-grid">
            {connectedSubjectAlerts.map((alert) => (
              <article key={`${alert.studentId}-${alert.courseCode}`}>
                <span className="avatar">{alert.initials}</span>
                <div>
                  <strong>{alert.subject}</strong>
                  <span>{alert.studentName}</span>
                  <small>
                    {alert.percentage}% attendance · {alert.status}
                  </small>
                </div>
                {role !== "student" && (
                  <button
                    onClick={() => onViewStudent(alert.studentId)}
                    type="button"
                  >
                    View profile
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="no-subject-alerts">
            No subject attendance alerts for this account.
          </p>
        )}
      </section>
      <section className="panel report-compact-filters">
        <div className="report-filter-title">
          <span>
            <Icon name="calendar" size={20} />
          </span>
          <div>
            <h3>Calendar report</h3>
            <p>Connected attendance report for each subject</p>
          </div>
        </div>
        <label className="course-selector">
          <span>Subject</span>
          <select
            aria-label="Select report subject"
            onChange={(event) => setReportCourseCode(event.target.value)}
            value={reportCourseCode}
          >
            <option value="all">All assigned subjects</option>
            {courses.map((course) => (
              <option key={course.code} value={course.code}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="course-selector date-selector">
          <span>Report date</span>
          <div>
            <Icon name="calendar" size={18} />
            <input
              aria-label="Select report date"
              onChange={(event) => setReportDate(event.target.value)}
              type="date"
              value={reportDate}
            />
          </div>
        </label>
      </section>
      {role !== "student" && (
        <section className="report-cards">
          {reportCards.map(([label, value, detail]) => (
            <article className="panel report-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>
      )}
      <section className="panel attendance-policy">
        <div className="policy-heading">
          <span>
            <Icon name="book" size={19} />
          </span>
          <div>
            <h3>Handbook attendance computation</h3>
            <p>
              Attendance % = (Present + Late) ÷ Scheduled class meetings × 100
            </p>
          </div>
        </div>
        <div className="policy-rules">
          <span>
            <b>80%</b> minimum class days required to earn credit
          </span>
          <span>
            <b>FA</b> below 80% or more than 11 absence hours
          </span>
          <span>
            <b>NA</b> no attendance recorded for the subject
          </span>
        </div>
        <p className="policy-note">
          Tardiness is counted as attendance and remains separately flagged for
          case-by-case faculty review. Practicum is exempt from the 80% rule.
        </p>
      </section>
      <section className="panel data-panel subject-standing-panel">
        <div className="subject-standing-heading">
          <div>
            <span className="eyebrow">Handbook result per subject</span>
            <h3>
              {role === "student"
                ? "My subject pass or fail standing"
                : "Student pass or fail by subject"}
            </h3>
            <p>
              {role === "student"
                ? "Your attendance eligibility for every enrolled subject"
                : "Individual attendance eligibility for each available subject"}
            </p>
          </div>
          <span className="period">{subjectStandingRows.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {role !== "student" && <th>Student</th>}
                <th>Subject</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Absence hours</th>
                <th>Attendance</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {subjectStandingRows.map(({ student, course, standing }) => (
                <tr key={`${student.id}-${course.code}`}>
                  {role !== "student" && (
                    <td>
                      <strong>{student.name}</strong>
                      <small className="course-code-label">{student.id}</small>
                    </td>
                  )}
                  <td>
                    <strong>{course.title}</strong>
                    <small className="course-code-label">{course.code}</small>
                  </td>
                  <td>{standing.present}</td>
                  <td>{standing.late}</td>
                  <td>{standing.absent}</td>
                  <td>
                    {standing.absent *
                      (course.attendance.classType === "Laboratory"
                        ? 3
                        : 2)}{" "}
                    hours
                  </td>
                  <td>
                    <strong>{standing.percentage}%</strong>
                  </td>
                  <td>
                    <span
                      className={`policy-mark ${
                        standing.mark === "Eligible"
                          ? "mark-eligible"
                          : "mark-fa"
                      }`}
                    >
                      {standing.mark === "Eligible" ? "PASS" : standing.mark}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="calendar-report-note">
          PASS means attendance meets the handbook requirement for that subject.
          FA means failure due to absences; NA means no attendance.
        </p>
      </section>
      <section className="panel data-panel daily-attendance-report">
        <div className="panel-heading">
          <div>
            <h3>
              {role === "student"
                ? "My daily attendance records"
                : "Daily attendance details"}
            </h3>
            <p>
              {role === "student"
                ? "Your personal status for every recorded subject and date"
                : "Attendance by class for every recorded date · selected date is highlighted"}
            </p>
          </div>
          <span className="period">{dailyReportRows.length} daily records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                {role === "student" ? (
                  <>
                    <th>Your status</th>
                    <th>Attendance credit</th>
                  </>
                ) : (
                  <>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Daily percentage</th>
                    <th>Handbook result</th>
                    <th>Students</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {dailyReportRows.map((row) => {
                const recordKey = `${row.courseCode}-${row.date}`
                const isExpanded = expandedDailyRecord === recordKey
                return (
                  <Fragment key={recordKey}>
                    <tr
                      className={
                        row.date === reportDate ? "selected-date-row" : ""
                      }
                    >
                      <td>
                        <strong>
                          {formatDate(row.date, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </strong>
                      </td>
                      <td>
                        {row.courseTitle}
                        <small className="course-code-label">
                          {row.courseCode}
                        </small>
                      </td>
                      {role === "student" ? (
                        <>
                          <td>
                            <StatusBadge>{row.studentStatus}</StatusBadge>
                          </td>
                          <td>
                            <span
                              className={`policy-mark ${
                                row.studentStatus === "Absent"
                                  ? "mark-fa"
                                  : "mark-eligible"
                              }`}
                            >
                              {row.studentStatus === "Absent"
                                ? "Not attended"
                                : "Attended"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{row.present}</td>
                          <td>{row.late}</td>
                          <td>{row.absent}</td>
                          <td>
                            <strong>{row.percentage}%</strong>
                          </td>
                          <td>
                            <span
                              className={`policy-mark ${
                                row.result === "Eligible"
                                  ? "mark-eligible"
                                  : "mark-fa"
                              }`}
                            >
                              {row.result}
                            </span>
                          </td>
                          <td>
                            <button
                              aria-expanded={isExpanded}
                              className="view-students-button"
                              onClick={() =>
                                setExpandedDailyRecord(
                                  isExpanded ? null : recordKey,
                                )
                              }
                              type="button"
                            >
                              {isExpanded ? "Hide students" : "View students"}
                              <Icon name="chevron" size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                    {role !== "student" && isExpanded && (
                      <tr className="daily-student-detail-row">
                        <td colSpan={8}>
                          <div className="daily-student-breakdown">
                            <div className="present-list">
                              <strong>Present · {row.present}</strong>
                              {row.presentStudents.map((name) => (
                                <span key={name}>
                                  <i /> {name}
                                </span>
                              ))}
                            </div>
                            <div className="late-list">
                              <strong>Late · {row.late}</strong>
                              {row.lateStudents.length ? (
                                row.lateStudents.map((name) => (
                                  <span key={name}>
                                    <i /> {name}
                                  </span>
                                ))
                              ) : (
                                <span>None</span>
                              )}
                            </div>
                            <div className="absent-list">
                              <strong>Absent · {row.absent}</strong>
                              {row.absentStudents.length ? (
                                row.absentStudents.map((name) => (
                                  <span key={name}>
                                    <i /> {name}
                                  </span>
                                ))
                              ) : (
                                <span>None</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="calendar-report-note">
          {role === "student"
            ? "Only your own attendance records are shown. Present and Late count as attended; Absent does not count toward attendance credit."
            : "Daily percentage = (Present + Late) ÷ 5 enrolled students × 100. Results below 80% are marked FA under the handbook attendance rule."}
        </p>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div>
            <h3>Attendance by class</h3>
            <p>Current term performance</p>
          </div>
          <Button className="secondary" onClick={exportSummaryReport}>
            <Icon name="chart" size={16} /> Export summary report
          </Button>
        </div>
        <div className="class-progress">
          {reportCourses.map((course) => {
            const result = computeAttendance(course.attendance)
            return (
              <div className="progress-row" key={course.code}>
                <strong>{course.title}</strong>
                <div className="progress-track">
                  <span style={{ width: `${result.percentage}%` }} />
                </div>
                <div className="progress-result">
                  <b>{result.percentage}%</b>
                  <small
                    className={`policy-mark mark-${result.mark.toLowerCase()}`}
                  >
                    {result.mark}
                  </small>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
