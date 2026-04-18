import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, Pencil, Settings2, Eye, Star, ShieldOff } from "lucide-react";
import { matrimonyApi } from "@/lib/api";

export default function MatrimonyMy() {
  const { data, isLoading } = useQuery({
    queryKey: ["matrimony-me"],
    queryFn: () => matrimonyApi.meSummary(),
  });

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["matrimony-dashboard"],
    queryFn: () => matrimonyApi.dashboard(),
  });

  return (
    <MatrimonyLayout title="My matrimony profiles">
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            <h1 className="text-2xl font-bold">My profiles</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/matrimony/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/matrimony/chats">Chats</Link>
            </Button>
            <Button asChild size="sm" className="bg-pink-600">
              <Link to="/matrimony/profile/new">New</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {dashLoading ? (
            <div className="sm:col-span-2 flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Interests sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.interestsSent ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    Interests received
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.interestsReceived ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Matches (accepted)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.interestsAccepted ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Profile views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.profileViewsTotal ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Shortlist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.shortlistCount ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShieldOff className="h-4 w-4" />
                    Blocked users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dash?.blockedUsersCount ?? 0}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && data?.profiles.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No matrimony profile yet.{" "}
            <Link to="/matrimony/profile/new" className="text-pink-600 underline">
              Create one
            </Link>
          </p>
        )}

        <ul className="space-y-4">
          {data?.profiles.map((p) => (
            <li key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {p.status.toLowerCase().replace("_", " ")} · step {p.draftStep}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Completion</span>
                  <span>{p.completionPercent}%</span>
                </div>
                <Progress value={p.completionPercent} className="h-2" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <Link to={`/matrimony/${p.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <Link to={`/matrimony/profile/${p.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit wizard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <Link to={`/matrimony/profile/${p.id}/settings`}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Button variant="ghost" className="w-full" asChild>
          <Link to="/matrimony">Back to matrimony</Link>
        </Button>
      </div>
    </MatrimonyLayout>
  );
}
