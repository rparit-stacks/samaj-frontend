import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";

export default function MaintenanceMode() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message") || "The site is temporarily under maintenance. Please check back soon.";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-amber-500 bg-slate-950 border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertTriangle className="h-12 w-12 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-amber-500">Maintenance Mode</CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-slate-300 text-lg font-medium">
            We're working on something great!
          </p>

          <p className="text-slate-400 text-sm leading-relaxed">
            {message}
          </p>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mt-6">
            <Clock className="h-4 w-4 animate-spin" />
            <span>We'll be back shortly...</span>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              If you have an urgent matter, please contact our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
