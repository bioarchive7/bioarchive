import CourseDetail from '@/components/CourseDetail';
import { CURRICULUM } from '@/data/curriculum';

interface PageProps {
  params: Promise<{
    courseCode: string;
  }>;
  searchParams: Promise<{
    semester?: string;
  }>;
}

export async function generateStaticParams() {
  const result = [];
  for (const semKey in CURRICULUM) {
    for (const course of CURRICULUM[semKey]) {
      result.push({ courseCode: course.code.toLowerCase() });
    }
  }
  return result;
}

export const metadata = {
  title: 'Course Files | BioArchive',
};

export default async function Page({ params, searchParams }: PageProps) {
  const { courseCode } = await params;
  const { semester = '1' } = await searchParams;

  return (
    <CourseDetail
      courseCode={courseCode.toUpperCase()}
      semester={semester}
    />
  );
}