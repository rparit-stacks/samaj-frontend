import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  Eye,
  Star,
  ShieldOff,
  Bell,
} from "lucide-react";
import { matrimonyApi } from "@/lib/api";

export default function MatrimonyDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["matrimony-dashboard"],
    queryFn: () => matrimonyApi.dashboard(),
  });

  return (
    <MatrimonyLayout title="Matrimony dashboard">
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <Link to="/matrimony">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Browse
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-pink-500" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{(error as Error).message}</p>
        )}

        {data && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Interests sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.interestsSent}</p>
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
                <p className="text-3xl font-bold">{data.interestsReceived}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Matches (accepted)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.interestsAccepted}</p>
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
                <p className="text-3xl font-bold">{data.profileViewsTotal}</p>
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
                <p className="text-3xl font-bold">{data.shortlistCount}</p>
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
                <p className="text-3xl font-bold">{data.blockedUsersCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-2">
          <Button className="w-full bg-pink-600" asChild>
            <Link to="/matrimony/chats" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Matrimony chats
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/matrimony/my">My profiles</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </Link>
          </Button>
        </div>
      </div>
    </MatrimonyLayout>
  );
}
