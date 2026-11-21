import { Fragment, useEffect, useState } from "react"
import { supabase } from "@/supabaseClient"
import {
  courseSections,
  academicYearSummary,
  adminClassSchedule,
  studentAttendanceHistory,
  summarizeStudentAttendance,
} from "@/features/shared/data"
import { AttendanceStatus, UserRole } from "@/types"
import { Icon } from "@/components/Icon"
import type { IconName } from "@/components/Icon"
import { Button, StatusBadge } from "@/components"
import { formatDate } from "@/lib/utils"

interface DbAttendanceRecord {
  id?: string
  student_id: string
  course_code: string
  date: string
  status: AttendanceStatus
}

interface DbStudentRow {
  id: string
  user_id?: string | null
  student_number?: string | null
  full_name: string
  program?: string | null
  year_level?: string | number | null
}

interface DailySubjectEntry {
  code: string
  title: string
  status: AttendanceStatus
  attended: boolean
}

type ReportCourse = (typeof courseSections)[number] & { year?: number }

function getLocalDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(date)
}

function getStudentInitials(fullName: string): string {
  const cleaned = fullName.trim()
  if (!cleaned) return "ST"
  if (cleaned.includes(",")) {
    const [lastPart, firstPart] = cleaned.split(",").map((s) => s.trim())
    return `${firstPart?.[0] || ""}${lastPart?.[0] || ""}`.toUpperCase() || "ST"
  }
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function isSharedProgram(program?: string | null): boolean {
  const normalized = (program || "BSCS").trim().toUpperCase()
  return (
    normalized === "BSCS" ||
    normalized === "ACT" ||
    normalized.includes("COMPUTER SCIENCE") ||
    normalized.includes("COMPUTER TECHNOLOGY")
  )
}

// Fetches all attendance rows in 1,000-row pages so Supabase never truncates records
async function fetchAllAttendanceRecords(options?: {
  courseCodes?: string[]
  studentKeys?: string[]
}): Promise<DbAttendanceRecord[]> {
  const pageSize = 1000
  let from = 0
  const allRows: DbAttendanceRecord[] = []

  while (true) {
    let query = supabase
      .from("attendance")
      .select("id, student_id, course_code, date, status")
      .order("date", { ascending: false })
      .order("student_id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (options?.courseCodes && options.courseCodes.length > 0) {
      query = query.in("course_code", options.courseCodes)
    }

    if (options?.studentKeys && options.studentKeys.length > 0) {
      query = query.in("student_id", options.studentKeys)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      break
    }

    allRows.push(...(data as DbAttendanceRecord[]))

    if (data.length < pageSize) {
      break
    }
    from += pageSize
  }

  return allRows
}

// Maps duplicate student records (e.g., auth-linked row + CSV-imported row) to one canonical student
function unifyStudents(rows: DbStudentRow[]) {
  const canonicalStudents: DbStudentRow[] = []
  const byNumber = new Map<string, DbStudentRow>()
  const byName = new Map<string, DbStudentRow>()
  const idToCanonicalId = new Map<string, string>()

  rows.forEach((row) => {
    const rawId = String(row.id ?? "").trim()
    const numKey = String(row.student_number ?? "")
      .trim()
      .toUpperCase()
    const nameKey = String(row.full_name ?? "")
      .trim()
      .toUpperCase()

    const existing =
      (numKey ? byNumber.get(numKey) : undefined) ||
      (nameKey ? byName.get(nameKey) : undefined)

    if (existing) {
      if (rawId) idToCanonicalId.set(rawId, existing.id)
      if (numKey) idToCanonicalId.set(numKey, existing.id)
      if (!existing.student_number && row.student_number) {
        existing.student_number = row.student_number
      }
      if (!existing.user_id && row.user_id) {
        existing.user_id = row.user_id
      }
    } else {
      const copy = { ...row }
      canonicalStudents.push(copy)
      if (rawId) idToCanonicalId.set(rawId, copy.id)
      if (numKey) {
        byNumber.set(numKey, copy)
        idToCanonicalId.set(numKey, copy.id)
      }
      if (nameKey) {
        byName.set(nameKey, copy)
      }
    }
  })

  return { canonicalStudents, idToCanonicalId }
}

function deduplicateAttendance(
  rows: DbAttendanceRecord[],
  idToCanonicalId?: Map<string, string>,
): DbAttendanceRecord[] {
  return Array.from(
    new Map(
      rows.map((row) => {
        const rawStudentId = String(row.student_id ?? "").trim()
        const canonicalStudentId =
          idToCanonicalId?.get(rawStudentId) ||
          idToCanonicalId?.get(rawStudentId.toUpperCase()) ||
          rawStudentId
        const normalizedCode = String(row.course_code ?? "")
          .trim()
          .toUpperCase()
        const normalizedDate = String(row.date ?? "").slice(0, 10)

        return [
          `${canonicalStudentId}-${normalizedCode}-${normalizedDate}`,
          {
            ...row,
            student_id: canonicalStudentId,
            course_code: normalizedCode,
            date: normalizedDate,
          },
        ]
      }),
    ).values(),
  )
}

function computeStanding(
  records: DbAttendanceRecord[],
  courseTitle: string,
  classType?: string,
) {
  const present = records.filter((row) => row.status === "Present").length
  const late = records.filter((row) => row.status === "Late").length
  const absent = records.filter((row) => row.status === "Absent").length
  const scheduled = present + late + absent
  const attended = present + late
  const isLab =
    classType === "Laboratory" ||
    courseTitle.toUpperCase().includes("LAB")
  const absenceHours = absent * (isLab ? 3 : 2)
  const percentage =
    scheduled === 0 ? 0 : Math.round((attended / scheduled) * 100)
  const mark: "Eligible" | "FA" | "NA" =
    scheduled === 0
      ? "NA"
      : percentage < 80 || absenceHours > 11
        ? "FA"
        : "Eligible"

  return {
    present,
    late,
    absent,
    scheduled,
    attended,
    absenceHours,
    percentage,
    mark,
  }
}

export function AdminReportsOverview() {
  const [reportDate, setReportDate] = useState(getLocalDateString())
  const [standingYear, setStandingYear] = useState(1)
  const [standingSubjectCode, setStandingSubjectCode] = useState(
    adminClassSchedule.find((course) => course.year === 1)?.code || "CC101",
  )
  const [dbStudents, setDbStudents] = useState<DbStudentRow[]>([])
  const [dbAttendance, setDbAttendance] = useState<DbAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const fetchAdminReportData = async () => {
      const [{ data: studentRows, error: studentError }, attendanceRows] =
        await Promise.all([
          supabase
            .from("students")
            .select(
              "id, user_id, student_number, full_name, program, year_level",
            )
            .order("full_name", { ascending: true }),
          fetchAllAttendanceRecords(),
        ])

      if (!active) return

      let idMap: Map<string, string> | undefined
      if (!studentError && studentRows) {
        const unified = unifyStudents(studentRows as DbStudentRow[])
        idMap = unified.idToCanonicalId
        setDbStudents(unified.canonicalStudents)
      }

      setDbAttendance(deduplicateAttendance(attendanceRows, idMap))
      setIsLoading(false)
    }

    void fetchAdminReportData()

    const channel = supabase
      .channel("admin-reports-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        () => {
          void fetchAdminReportData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
        },
        () => {
          void fetchAdminReportData()
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const standingCourses = adminClassSchedule.filter(
    (course) => course.year === standingYear,
  )
  const standingSubject =
    standingCourses.find((course) => course.code === standingSubjectCode) ||
    standingCourses[0]

  const activeSubjectStudents = dbStudents.filter(
    (student) =>
      Number(student.year_level) === standingYear &&
      isSharedProgram(student.program),
  )

  const adminSubjectStandings = activeSubjectStudents.map((student) => {
    const subjectCodeUpper = (standingSubject?.code || "").trim().toUpperCase()
    const records = dbAttendance.filter(
      (row) =>
        row.student_id === student.id &&
        row.course_code === subjectCodeUpper,
    )

    const standing = computeStanding(records, standingSubject?.title || "")

    return {
      student: {
        id: student.student_number || student.id,
        dbId: student.id,
        name: student.full_name,
        program: (student.program || "BSCS").trim().toUpperCase(),
      },
      standing,
    }
  })

  const passingCount = adminSubjectStandings.filter(
    (record) => record.standing.mark === "Eligible",
  ).length
  const failingCount = adminSubjectStandings.length - passingCount

  const totalMarked = dbAttendance.length
  const totalAttended = dbAttendance.filter(
    (row) => row.status === "Present" || row.status === "Late",
  ).length
  const overallAttendanceRate =
    totalMarked === 0
      ? 0
      : Number(((totalAttended / totalMarked) * 100).toFixed(1))

  const yearLevelReportRows = academicYearSummary.map((summary) => {
    const combinedYearStudents = dbStudents.filter(
      (student) =>
        Number(student.year_level) === summary.year &&
        isSharedProgram(student.program),
    )
    const hasAct = combinedYearStudents.some(
      (student) =>
        (student.program || "").trim().toUpperCase() === "ACT" ||
        (student.program || "")
          .trim()
          .toUpperCase()
          .includes("COMPUTER TECHNOLOGY"),
    )
    const yearCourseCodes = new Set(
      adminClassSchedule
        .filter((course) => course.year === summary.year)
        .map((course) => course.code.trim().toUpperCase()),
    )
    const yearStudentIds = new Set(combinedYearStudents.map((s) => s.id))

    const yearRecords = dbAttendance.filter(
      (row) =>
        yearCourseCodes.has(row.course_code) ||
        yearStudentIds.has(row.student_id),
    )
    const present = yearRecords.filter((row) => row.status === "Present").length
    const late = yearRecords.filter((row) => row.status === "Late").length
    const absent = yearRecords.filter((row) => row.status === "Absent").length
    const attended = present + late
    const rate =
      yearRecords.length === 0
        ? 0
        : Number(((attended / yearRecords.length) * 100).toFixed(1))

    return {
      ...summary,
      sectionLabel: hasAct
        ? `BSCS / ACT ${summary.year}A`
        : `BSCS ${summary.year}A`,
      liveStudents: combinedYearStudents.length || summary.students,
      present,
      late,
      absent,
      rate,
    }
  })

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
      ...yearLevelReportRows.map((row) => [
        `Year ${row.year}`,
        String(row.liveStudents),
        String(row.subjects),
        String(row.units),
        String(row.hours),
        String(row.present),
        String(row.late),
        String(row.absent),
        `${row.rate}%`,
      ]),
      [],
      ["Per-subject handbook standing"],
      ["Subject", standingSubject?.title || ""],
      [
        "Student",
        "Program",
        "Present",
        "Late",
        "Absent",
        "Absence hours",
        "Attendance",
        "Result",
      ],
      ...adminSubjectStandings.map(({ student, standing }) => [
        student.name,
        student.program,
        String(standing.present),
        String(standing.late),
        String(standing.absent),
        String(standing.absenceHours),
        `${standing.percentage}%`,
        standing.mark === "Eligible" ? "PASS" : standing.mark,
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
          [
            "students",
            String(dbStudents.length || 66),
            "Students",
            "BSCS & ACT",
          ],
          ["teachers", "8", "Teachers", "Faculty assignments"],
          [
            "book",
            String(adminClassSchedule.length || 35),
            "Class Schedule",
            "4 year levels",
          ],
          [
            "chart",
            isLoading ? "..." : `${overallAttendanceRate}%`,
            "Attendance",
            "Current average",
          ],
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
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      color: "#64748b",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    Loading student attendance records...
                  </td>
                </tr>
              ) : adminSubjectStandings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      color: "#64748b",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    No students found for Year {standingYear}.
                  </td>
                </tr>
              ) : (
                adminSubjectStandings.map(({ student, standing }) => (
                  <tr key={student.dbId}>
                    <td>
                      <strong>{student.name}</strong>
                      <small className="course-code-label">
                        {student.id} · {student.program}
                      </small>
                    </td>
                    <td>{standing.present}</td>
                    <td>{standing.late}</td>
                    <td>{standing.absent}</td>
                    <td>{standing.absenceHours} hours</td>
                    <td>
                      <strong>{standing.percentage}%</strong>
                    </td>
                    <td>
                      <span
                        className={`policy-mark ${
                          standing.mark === "Eligible"
                            ? "mark-eligible"
                            : standing.mark === "NA"
                              ? "mark-na"
                              : "mark-fa"
                        }`}
                      >
                        {standing.mark === "Eligible" ? "PASS" : standing.mark}
                      </span>
                    </td>
                  </tr>
                ))
              )}
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
              {yearLevelReportRows.map((row) => (
                <tr key={row.year}>
                  <td>
                    <strong>Year {row.year}</strong>
                    <small className="course-code-label">
                      {row.sectionLabel}
                    </small>
                  </td>
                  <td>{row.liveStudents}</td>
                  <td>{row.subjects}</td>
                  <td>{row.units}</td>
                  <td>{row.hours}</td>
                  <td>
                    <strong>{row.rate}%</strong>
                  </td>
                  <td>
                    <span className="policy-mark mark-eligible">Connected</span>
                  </td>
                </tr>
              ))}
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
  courses: ReportCourse[]
  onViewStudent: (studentId: string) => void
}) {
  const [reportDate, setReportDate] = useState(getLocalDateString())
  const [reportCourseCode, setReportCourseCode] = useState("all")
  const [expandedDailyRecord, setExpandedDailyRecord] = useState<string | null>(
    null,
  )
  const [dbStudentUuid, setDbStudentUuid] = useState<string | null>(null)
  const [dbStudents, setDbStudents] = useState<DbStudentRow[]>([])
  const [dbAttendance, setDbAttendance] = useState<DbAttendanceRecord[]>([])

  // Load live student attendance (for student portal)
  useEffect(() => {
    if (role !== "student") return

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const loadStudentAttendance = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const matchedStudentKeys = new Set<string>()
      let primaryUuid: string | null = null

      if (user) {
        const { data: studentsByUser } = await supabase
          .from("students")
          .select("id, student_number")
          .eq("user_id", user.id)

        ;(studentsByUser ?? []).forEach((row) => {
          if (row.id) {
            matchedStudentKeys.add(String(row.id))
            if (!primaryUuid) primaryUuid = String(row.id)
          }
          if (row.student_number) {
            matchedStudentKeys.add(String(row.student_number))
          }
        })
      }

      if (studentId) {
        matchedStudentKeys.add(studentId)
        const { data: studentsByNumber } = await supabase
          .from("students")
          .select("id, student_number")
          .eq("student_number", studentId)

        ;(studentsByNumber ?? []).forEach((row) => {
          if (row.id) {
            matchedStudentKeys.add(String(row.id))
            if (!primaryUuid) primaryUuid = String(row.id)
          }
        })
      }

      const studentKeyList = Array.from(matchedStudentKeys)
      if (!active || studentKeyList.length === 0) return
      if (primaryUuid) setDbStudentUuid(primaryUuid)

      const fetchRows = async () => {
        const rows = await fetchAllAttendanceRecords({
          studentKeys: studentKeyList,
        })

        if (active) {
          const canonicalMap = new Map<string, string>()
          const targetId = primaryUuid || studentKeyList[0]
          studentKeyList.forEach((key) => {
            canonicalMap.set(key, targetId)
            canonicalMap.set(key.toUpperCase(), targetId)
          })
          setDbAttendance(deduplicateAttendance(rows, canonicalMap))
        }
      }

      await fetchRows()

      channel = supabase
        .channel(`student-attendance-${primaryUuid || studentKeyList[0]}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "attendance",
          },
          () => {
            void fetchRows()
          },
        )
        .subscribe()
    }

    void loadStudentAttendance()

    return () => {
      active = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [role, studentId])

  // Load live students & saved attendance for all assigned subjects (for professor portal)
  useEffect(() => {
    if (role !== "professor") return

    let active = true
    const assignedCodes = courses.map((c) => c.code.trim())

    const fetchProfessorReportData = async () => {
      const { data: studentsRows, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, student_number, full_name, program, year_level")
        .order("full_name", { ascending: true })

      let idMap: Map<string, string> | undefined
      if (!studentsError && studentsRows && active) {
        const unified = unifyStudents(studentsRows as DbStudentRow[])
        idMap = unified.idToCanonicalId
        setDbStudents(unified.canonicalStudents)
      }

      if (assignedCodes.length === 0) {
        if (active) setDbAttendance([])
        return
      }

      const attendanceRows = await fetchAllAttendanceRecords({
        courseCodes: assignedCodes,
      })

      if (active) {
        setDbAttendance(deduplicateAttendance(attendanceRows, idMap))
      }
    }

    void fetchProfessorReportData()

    const channel = supabase
      .channel(`professor-reports-${profile.name}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        () => {
          void fetchProfessorReportData()
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [role, courses, profile.name])

  const getCourseYearLevel = (course: ReportCourse): number | null => {
    if (typeof course.year === "number") return course.year
    const scheduleMatch = adminClassSchedule.find(
      (item) =>
        item.code.trim().toUpperCase() === course.code.trim().toUpperCase(),
    )
    if (scheduleMatch) return scheduleMatch.year
    const sectionMatch = course.section?.match(/\d+/)
    return sectionMatch ? Number(sectionMatch[0]) : null
  }

  const getEnrolledStudentsForCourse = (course: ReportCourse): DbStudentRow[] => {
    const yearLevel = getCourseYearLevel(course)
    const courseUpper = course.code.trim().toUpperCase()
    const recordedStudentIds = new Set(
      dbAttendance
        .filter((row) => row.course_code === courseUpper)
        .map((row) => row.student_id),
    )

    return dbStudents.filter((student) => {
      const matchesYearAndProgram =
        yearLevel !== null &&
        Number(student.year_level) === yearLevel &&
        isSharedProgram(student.program)
      return matchesYearAndProgram || recordedStudentIds.has(student.id)
    })
  }

  const getCourseStats = (course: ReportCourse) => {
    const records = dbAttendance.filter(
      (row) => row.course_code === course.code.trim().toUpperCase(),
    )
    return computeStanding(
      records,
      course.title,
      course.attendance.classType,
    )
  }

  const reportCourses =
    reportCourseCode === "all"
      ? courses
      : courses.filter((course) => course.code === reportCourseCode)
  const selectedReportCourse = courses.find(
    (course) => course.code === reportCourseCode,
  )

  const reportAttendance = (() => {
    const totals = reportCourses.reduce(
      (acc, course) => {
        const stats = getCourseStats(course)
        acc.attended += stats.attended
        acc.scheduled += stats.scheduled
        return acc
      },
      { attended: 0, scheduled: 0 },
    )
    return totals.scheduled === 0
      ? 0
      : Number(((totals.attended / totals.scheduled) * 100).toFixed(1))
  })()

  const dailyReportRows =
    role === "student"
      ? Array.from(
          dbAttendance
            .filter((row) =>
              reportCourses.some(
                (course) =>
                  course.code.trim().toUpperCase() === row.course_code,
              ),
            )
            .reduce((byDate, row) => {
              const matchedCourse = courses.find(
                (course) =>
                  course.code.trim().toUpperCase() === row.course_code,
              )
              const courseCode = matchedCourse?.code || row.course_code
              const courseTitle = matchedCourse?.title || row.course_code
              const attended = row.status !== "Absent"
              const dateKey = row.date
              const existing = byDate.get(dateKey)

              if (!existing) {
                byDate.set(dateKey, {
                  date: dateKey,
                  present: row.status === "Present" ? 1 : 0,
                  late: row.status === "Late" ? 1 : 0,
                  absent: row.status === "Absent" ? 1 : 0,
                  subjects: [
                    {
                      code: courseCode,
                      title: courseTitle,
                      status: row.status,
                      attended,
                    },
                  ],
                })
              } else if (
                !existing.subjects.some((subj) => subj.code === courseCode)
              ) {
                existing.present += row.status === "Present" ? 1 : 0
                existing.late += row.status === "Late" ? 1 : 0
                existing.absent += row.status === "Absent" ? 1 : 0
                existing.subjects.push({
                  code: courseCode,
                  title: courseTitle,
                  status: row.status,
                  attended,
                })
              }

              return byDate
            }, new Map<
              string,
              {
                date: string
                present: number
                late: number
                absent: number
                subjects: DailySubjectEntry[]
              }
            >())
            .values(),
        ).map((day) => {
          const orderedSubjects = [...day.subjects].sort((a, b) => {
            const indexA = courses.findIndex(
              (c) => c.code.trim().toUpperCase() === a.code.trim().toUpperCase(),
            )
            const indexB = courses.findIndex(
              (c) => c.code.trim().toUpperCase() === b.code.trim().toUpperCase(),
            )
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
          })
          const totalClasses = orderedSubjects.length
          const attendedCount = day.present + day.late
          const creditSummary =
            day.absent === 0
              ? "Attended"
              : attendedCount === 0
                ? "Not attended"
                : `${attendedCount}/${totalClasses} Attended`

          return {
            date: day.date,
            present: day.present,
            late: day.late,
            absent: day.absent,
            courseCode: orderedSubjects.map((s) => s.code).join(" · "),
            courseTitle: orderedSubjects.map((s) => s.title).join(", "),
            subjects: orderedSubjects,
            percentage: Math.round(
              (attendedCount / Math.max(1, totalClasses)) * 100,
            ),
            result: day.absent === 0 ? "Eligible" : "FA",
            presentStudents: [] as string[],
            lateStudents: [] as string[],
            absentStudents: [] as string[],
            studentStatus: "Active",
            creditSummary,
          }
        })
      : (() => {
          const studentMap = new Map(
            dbStudents.map((s) => [s.id, s.full_name]),
          )
          const grouped = new Map<
            string,
            {
              date: string
              courseCode: string
              courseTitle: string
              presentStudents: string[]
              lateStudents: string[]
              absentStudents: string[]
            }
          >()

          dbAttendance.forEach((row) => {
            const matchedCourse = reportCourses.find(
              (course) =>
                course.code.trim().toUpperCase() === row.course_code,
            )
            if (!matchedCourse) return

            const dateKey = row.date
            const key = `${matchedCourse.code}-${dateKey}`
            if (!grouped.has(key)) {
              grouped.set(key, {
                date: dateKey,
                courseCode: matchedCourse.code,
                courseTitle: matchedCourse.title,
                presentStudents: [],
                lateStudents: [],
                absentStudents: [],
              })
            }

            const entry = grouped.get(key)!
            const studentName =
              studentMap.get(row.student_id) || "Unknown Student"

            if (row.status === "Present") {
              entry.presentStudents.push(studentName)
            } else if (row.status === "Late") {
              entry.lateStudents.push(studentName)
            } else if (row.status === "Absent") {
              entry.absentStudents.push(studentName)
            }
          })

          return Array.from(grouped.values())
            .sort((a, b) => {
              const dateCmp = b.date.localeCompare(a.date)
              return dateCmp !== 0
                ? dateCmp
                : a.courseCode.localeCompare(b.courseCode)
            })
            .map((item) => {
              const present = item.presentStudents.length
              const late = item.lateStudents.length
              const absent = item.absentStudents.length
              const total = present + late + absent
              const percentage = Number(
                (((present + late) / Math.max(1, total)) * 100).toFixed(1),
              )
              return {
                date: item.date,
                present,
                late,
                absent,
                courseCode: item.courseCode,
                courseTitle: item.courseTitle,
                subjects: [] as DailySubjectEntry[],
                percentage,
                result: percentage >= 80 ? "Eligible" : "FA",
                presentStudents: item.presentStudents.sort(),
                lateStudents: item.lateStudents.sort(),
                absentStudents: item.absentStudents.sort(),
                studentStatus: "Active",
                creditSummary: "",
              }
            })
        })()

  const subjectStandingRows =
    role === "student"
      ? reportCourses.map((course) => {
          const stats = getCourseStats(course)
          return {
            student: {
              id: dbStudentUuid || studentId || "student",
              displayId: studentId || dbStudentUuid || "student",
              name: profile.name,
              initials: profile.initials,
              program: "",
            },
            course,
            standing: {
              present: stats.present,
              late: stats.late,
              absent: stats.absent,
              scheduled: stats.scheduled,
              absenceHours: stats.absenceHours,
              percentage: stats.percentage,
              mark: stats.mark,
            },
          }
        })
      : reportCourses.flatMap((course) => {
          const enrolledStudents = getEnrolledStudentsForCourse(course)
          return enrolledStudents.map((student) => {
            const studentRecords = dbAttendance.filter(
              (row) =>
                row.student_id === student.id &&
                row.course_code === course.code.trim().toUpperCase(),
            )
            const stats = computeStanding(
              studentRecords,
              course.title,
              course.attendance.classType,
            )
            return {
              student: {
                id: student.id,
                displayId: student.student_number || student.id,
                name: student.full_name,
                initials: getStudentInitials(student.full_name),
                program: (student.program || "BSCS").trim().toUpperCase(),
              },
              course,
              standing: {
                present: stats.present,
                late: stats.late,
                absent: stats.absent,
                scheduled: stats.scheduled,
                absenceHours: stats.absenceHours,
                percentage: stats.percentage,
                mark: stats.mark,
              },
            }
          })
        })

  const connectedSubjectAlerts = subjectStandingRows
    .filter(
      ({ standing }) =>
        standing.scheduled > 0 &&
        (standing.mark === "FA" ||
          (standing.mark === "Eligible" && standing.percentage < 85)),
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

  const professorSummaryStats = (() => {
    const byStudent = new Map<
      string,
      { scheduled: number; absent: number; hasAlert: boolean }
    >()

    subjectStandingRows.forEach(({ student, standing }) => {
      if (standing.scheduled === 0) return
      const current = byStudent.get(student.id) || {
        scheduled: 0,
        absent: 0,
        hasAlert: false,
      }
      current.scheduled += standing.scheduled
      current.absent += standing.absent
      if (standing.mark === "FA" || standing.percentage < 85) {
        current.hasAlert = true
      }
      byStudent.set(student.id, current)
    })

    let perfectCount = 0
    let atRiskCount = 0
    byStudent.forEach((summary) => {
      if (summary.absent === 0) perfectCount += 1
      if (summary.hasAlert) atRiskCount += 1
    })

    return { perfectCount, atRiskCount }
  })()

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
          [
            "Perfect attendance",
            String(professorSummaryStats.perfectCount),
            "students",
          ],
          [
            "At-risk students",
            String(professorSummaryStats.atRiskCount),
            "require follow-up",
          ],
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
        : [
            [
              "Perfect attendance",
              `${professorSummaryStats.perfectCount} students`,
            ],
            [
              "At-risk students",
              `${professorSummaryStats.atRiskCount} students`,
            ],
          ]),
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
        const stats = getCourseStats(course)
        return [
          course.title,
          course.section,
          course.attendance.classType,
          String(stats.scheduled),
          String(stats.present),
          String(stats.late),
          String(stats.absent),
          String(stats.absenceHours),
          `${stats.percentage}%`,
          stats.mark,
          "",
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
        String(standing.absenceHours),
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
              "Active",
              row.subjects.length > 1
                ? `${row.creditSummary} (${row.subjects
                    .map(
                      (s) =>
                        `${s.code}: ${s.attended ? `Attended (${s.status})` : "Not attended"}`,
                    )
                    .join("; ")})`
                : row.creditSummary,
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
          <StatusBadge>Active</StatusBadge>
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
              {subjectStandingRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={role !== "student" ? 8 : 7}
                    style={{
                      color: "#64748b",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    No student records found for the selected subject.
                  </td>
                </tr>
              ) : (
                subjectStandingRows.map(({ student, course, standing }) => (
                  <tr key={`${student.id}-${course.code}`}>
                    {role !== "student" && (
                      <td>
                        <strong>{student.name}</strong>
                        <small className="course-code-label">
                          {student.displayId} · {student.program}
                        </small>
                      </td>
                    )}
                    <td>
                      <strong>{course.title}</strong>
                      <small className="course-code-label">{course.code}</small>
                    </td>
                    <td>{standing.present}</td>
                    <td>{standing.late}</td>
                    <td>{standing.absent}</td>
                    <td>{standing.absenceHours} hours</td>
                    <td>
                      <strong>{standing.percentage}%</strong>
                    </td>
                    <td>
                      <span
                        className={`policy-mark ${
                          standing.mark === "Eligible"
                            ? "mark-eligible"
                            : standing.mark === "NA"
                              ? "mark-na"
                              : "mark-fa"
                        }`}
                      >
                        {standing.mark === "Eligible" ? "PASS" : standing.mark}
                      </span>
                    </td>
                  </tr>
                ))
              )}
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
              {dailyReportRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={role === "student" ? 4 : 8}
                    style={{
                      color: "#64748b",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    No daily attendance records yet.
                  </td>
                </tr>
              ) : (
                dailyReportRows.map((row) => {
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
                          {role === "student" && row.subjects.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.45rem",
                              }}
                            >
                              {row.subjects.map((subj) => (
                                <div key={subj.code}>
                                  <strong>{subj.title}</strong>
                                  <small className="course-code-label">
                                    {subj.code}
                                  </small>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              {row.courseTitle}
                              <small className="course-code-label">
                                {row.courseCode}
                              </small>
                            </>
                          )}
                        </td>
                        {role === "student" ? (
                          <>
                            <td>
                              <StatusBadge>Active</StatusBadge>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.45rem",
                                  alignItems: "flex-start",
                                }}
                              >
                                <span
                                  className={`policy-mark ${
                                    row.absent === 0
                                      ? "mark-eligible"
                                      : "mark-fa"
                                  }`}
                                >
                                  {row.creditSummary}
                                </span>
                                {row.subjects.length > 1 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    {row.subjects.map((subj) => (
                                      <small
                                        key={subj.code}
                                        style={{
                                          color: subj.attended
                                            ? "#15803d"
                                            : "#b91c1c",
                                          fontWeight: 600,
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        {subj.code}:{" "}
                                        {subj.attended
                                          ? `Attended (${subj.status})`
                                          : "Not attended (Absent)"}
                                      </small>
                                    ))}
                                  </div>
                                )}
                              </div>
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
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="calendar-report-note">
          {role === "student"
            ? "Only your own attendance records are shown. Present and Late count as attended; Absent does not count toward attendance credit."
            : "Daily percentage = (Present + Late) ÷ Total recorded students × 100. Results below 80% are marked FA under the handbook attendance rule."}
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
            const result = getCourseStats(course)
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