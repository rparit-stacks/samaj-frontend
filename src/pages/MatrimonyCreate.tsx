import { Navigate } from "react-router-dom";

/** Legacy route — use the multi-step wizard. */
export default function MatrimonyCreate() {
  return <Navigate to="/matrimony/profile/new" replace />;
}
