# Subject combinations at promotion

Apply `supabase/migrations/202609290001_promote_with_subject_combinations.sql` before deploying the promotion UI and result-card changes. The migration makes 8th-to-9th and 10th-to-11th combination assignment part of the promotion transaction, snapshots each enrollment's combination, keeps the active snapshot synchronized with staff edits, and carries custom combination availability from 9th-to-10th and 11th-to-12th. Result cards use the combination saved on the enrollment for the card's class and academic session. Existing `students.major` remains for current-class compatibility. Older closed enrollments without a saved combination use their historical subject-enrollment and mark records; an exact combination that was never stored cannot be reconstructed.

Manual QA:

1. Open **Classes**, choose **Promote** for an 8th-grade class, select students, then **Review promotion**. Confirm the popup requires a combination for every selected student. Choose the combinations and complete promotion. Check each student's 9th-grade class record.
2. Repeat for a 10th-grade class entering 11th. Confirm a new choice is required even when the student had a 9th/10th combination.
3. Promote 9th to 10th and 11th to 12th. Confirm there is no new choice step and the student's current combination is unchanged, including a custom combination.
4. Print results from the prior session after a student enters 11th. Confirm subjects are based on the enrollment's saved combination, not their new choice.
5. Cancel from the review step and verify no promotion or combination change occurred.
