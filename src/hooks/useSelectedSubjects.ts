import { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { SUBJECT_INFOS } from '@/lib/curriculum';
import type { SubjectInfo } from '@/lib/types';

const SUPPORTED_SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];

export interface SelectedSubjectInfo extends SubjectInfo {}

export function useSelectedSubjects() {
  const { profile } = useApp();

  const subjects = useMemo<string[]>(() => {
    const selected = profile?.selectedSubjects ?? [];
    const filtered = SUPPORTED_SUBJECTS.filter((s) => selected.includes(s));
    return filtered.length > 0 ? filtered : SUPPORTED_SUBJECTS;
  }, [profile?.selectedSubjects]);

  const subjectInfos = useMemo<SubjectInfo[]>(() => {
    return subjects
      .map((id) => SUBJECT_INFOS.find((s) => s.id === id))
      .filter((s): s is SubjectInfo => s !== undefined);
  }, [subjects]);

  const classId = useMemo(() => profile?.classLevel ?? 'class-9', [profile?.classLevel]);
  const classLabel = useMemo(() => {
    const match = classId.match(/class-(\d+)/);
    return match ? `Class ${match[1]}` : 'Class 9';
  }, [classId]);

  const defaultSubject = useMemo(() => {
    if (profile?.currentSubject && subjects.includes(profile.currentSubject)) {
      return profile.currentSubject;
    }
    return subjects[0] ?? 'Physics';
  }, [profile?.currentSubject, subjects]);

  return {
    subjects,
    subjectInfos,
    classId,
    classLabel,
    defaultSubject,
    board: profile?.board ?? 'Kerala SCERT',
    currentSubject: profile?.currentSubject ?? '',
    currentChapter: profile?.currentChapter ?? '',
    currentTopic: profile?.currentTopic ?? '',
  };
}
