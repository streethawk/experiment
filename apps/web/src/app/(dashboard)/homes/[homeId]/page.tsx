import { redirect } from 'next/navigation';

export default function HomeIndexPage({ params }: { params: { homeId: string } }) {
  redirect(`/homes/${params.homeId}/residents`);
}
