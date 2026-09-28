# Historical result cards

## Diagnosis

The latest `promote_class_students` function in `202609180001_make_class_promotion_atomic.sql` inserts an active enrollment for the next academic year and class, changes the source enrollment to `completed` with `ends_on`, sets student status to `active` or `graduated`, and inserts `class_promotions`. It creates the next academic year and target classes when needed. It does not delete marks, exams, students, or source enrollments, and it does not change `students.class_id`. Earlier promotion migrations did change `students.class_id`; the latest function supersedes them.

Result readiness and printable card rosters queried `enrollments` by school and class with `status = 'active'`. Once promotion completed the source row, the old class roster became empty. Marks were also filtered by `marks.class_id`, even though the approved exam IDs already identify the historical class. Exams are keyed by `class_id`; the class identifies `academic_year_id`. The result path does not need the student's current class. The result page previously offered all classes without a session selector and defaulted to the first name-sorted class.

A read-only check of the configured Supabase database found 166 students, 77 enrollments, 85 exams, 196 marks, 14 students enrolled in more than one academic year, and 19 closed enrollment rows. No `class_promotions` rows exist there, so an actual promotion through the current dialog could not be sampled. A student with a withdrawn and an active enrollment retained approved exam marks tied to the active class. The repository's `enrollments_select` RLS policy permits administrator, principal, and student staff school-scoped reads; teachers can read head-class enrollments. The active-status filter was in application queries, not this RLS policy.

## Migration and compatibility

Apply `supabase/migrations/202609280001_historical_result_enrollments.sql` before deploying the result changes. It adds a nullable historical `roll_no`, reconstructs missing enrollments from same-school marks, exams, classes and academic years, and indexes result lookups. Existing enrollments and current-class columns stay intact. Historical roll numbers that were never stored cannot be reconstructed reliably; those remain null. The migration does not alter role policies or principal approval rules.

## Manual QA

1. Sign in as a registrar. Open **Results → Result Cards**.
2. Choose the prior **Session**, **Class**, **Exam type**, and **Month** for Monthly; click **Check**.
3. Choose **Print / PDF Individual** for a student subsequently promoted. Confirm the old class, academic year, approved marks and card footer.
4. Click **Print / PDF All** and confirm one page per student and no students from another class.
5. Choose the current session and new class; repeat individual and whole-class printing.
6. Repeat for a student who stayed, withdrew, or repeated a grade. For a class with no approved exams, confirm the pending message instead of an error.
7. Sign in to a second school and confirm neither the first school's sessions nor classes appear.
