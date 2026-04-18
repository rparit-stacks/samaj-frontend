import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, FileText, Image, AlertTriangle, Check, X, 
  Eye, UserCheck, UserX, BarChart3, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const pendingUsers = [
  {
    id: "1",
    name: "Rohit Sharma",
    email: "rohit.sharma@email.com",
    phone: "+91 98765 43210",
    city: "Delhi",
    registeredAt: "Jan 12, 2026",
  },
  {
    id: "2",
    name: "Meera Patel",
    email: "meera.patel@email.com",
    phone: "+91 98765 43211",
    city: "Mumbai",
    registeredAt: "Jan 11, 2026",
  },
  {
    id: "3",
    name: "Suresh Kumar",
    email: "suresh.k@email.com",
    phone: "+91 98765 43212",
    city: "Bangalore",
    registeredAt: "Jan 10, 2026",
  },
];

const pendingPosts = [
  {
    id: "1",
    author: "Priya Sharma",
    content: "Looking for recommendations for wedding venues in Delhi...",
    type: "Feed Post",
    submittedAt: "2 hours ago",
  },
  {
    id: "2",
    author: "Amit Agarwal",
    content: "Sharing photos from yesterday's community gathering...",
    type: "Gallery",
    submittedAt: "5 hours ago",
    hasImages: true,
  },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AppLayout title="Admin">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage users, content, and community settings</p>
          </div>
          <Badge className="bg-primary self-start">Administrator</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard 
            title="Total Users" 
            value="2,547" 
            icon={Users} 
            trend={{ value: 12, label: "this month" }}
          />
          <StatCard 
            title="Pending Verifications" 
            value="15" 
            icon={UserCheck}
            variant="secondary"
          />
          <StatCard 
            title="Pending Content" 
            value="8" 
            icon={FileText}
          />
          <StatCard 
            title="Active Emergencies" 
            value="2" 
            icon={AlertTriangle}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="overview" className="flex-1 md:flex-none">Overview</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 md:flex-none">
              Users
              <Badge className="ml-1 bg-primary text-primary-foreground text-xs">15</Badge>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex-1 md:flex-none">
              Content
              <Badge className="ml-1 bg-primary text-primary-foreground text-xs">8</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">User Approved</p>
                      <p className="text-xs text-muted-foreground">Rajesh Gupta was verified by Admin</p>
                      <p className="text-xs text-muted-foreground">10 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">News Published</p>
                      <p className="text-xs text-muted-foreground">Annual gathering announcement posted</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Emergency Created</p>
                      <p className="text-xs text-muted-foreground">Blood donation request posted</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">News Views (This Week)</span>
                    <span className="font-semibold">12,456</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Event RSVPs (This Month)</span>
                    <span className="font-semibold">789</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Directory Searches</span>
                    <span className="font-semibold">3,245</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Matrimony Views</span>
                    <span className="font-semibold">1,567</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Community Posts</span>
                    <span className="font-semibold">234</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Pending User Verifications</h2>
            
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-4 px-6 font-semibold text-sm">User</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Contact</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">City</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Registered</th>
                      <th className="text-right py-4 px-6 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">{user.phone}</td>
                        <td className="py-4 px-4 text-sm">{user.city}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{user.registeredAt}</td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm">
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.city} • {user.registeredAt}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1">
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Pending Content Moderation</h2>
            
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <Card key={post.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{post.type}</Badge>
                          <span className="text-xs text-muted-foreground">{post.submittedAt}</span>
                        </div>
                        <p className="font-medium">{post.author}</p>
                        <p className="text-sm text-muted-foreground mt-1">{post.content}</p>
                        {post.hasImages && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Image className="h-3 w-3" />
                            <span>Contains 3 images</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
