import { Navigate, useParams } from "react-router-dom";

/** Legacy route — use the multi-step wizard. */
export default function MatrimonyEditProfile() {
  const { profileId } = useParams<{ profileId: string }>();
  if (!profileId) return null;
  return <Navigate to={`/matrimony/profile/${profileId}/edit`} replace />;
}
