import { useState } from "react";
import { Search, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  adminMatrimonyContentApi,
  type AdminMatrimonyPhotoDto,
  type AdminMatrimonyBioDto,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminMatrimonyContent() {
  const [activeTab, setActiveTab] = useState("photos");
  const [photoPage, setPhotoPage] = useState(0);
  const [photoSearch, setPhotoSearch] = useState("");
  const [bioPage, setBioPage] = useState(0);
  const [bioSearch, setBioSearch] = useState("");

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ["admin", "matrimony", "content", "photos", photoPage, photoSearch],
    queryFn: () =>
      adminMatrimonyContentApi.listPhotos({
        page: photoPage,
        size: 20,
        q: photoSearch || undefined,
      }),
  });

  const { data: bios, isLoading: biosLoading } = useQuery({
    queryKey: ["admin", "matrimony", "content", "bios", bioPage, bioSearch],
    queryFn: () =>
      adminMatrimonyContentApi.listBios({
        page: bioPage,
        size: 20,
        q: bioSearch || undefined,
      }),
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Moderation</h1>
          <p className="text-slate-600 mt-1">
            Review and moderate profile photos and biographies to maintain community standards.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="bios" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Biographies
            </TabsTrigger>
          </TabsList>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Photo Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Search profile names
                    </Label>
                    <Input
                      placeholder="Search by profile name..."
                      value={photoSearch}
                      onChange={(e) => {
                        setPhotoSearch(e.target.value);
                        setPhotoPage(0);
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">
                  All Photos{" "}
                  {photos && (
                    <span className="text-slate-500 font-normal">({photos.totalElements})</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {photosLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square" />
                    ))}
                  </div>
                ) : (photos?.content ?? []).length === 0 ? (
                  <p className="text-center text-slate-500 py-12">No photos found</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {photos?.content.map((photo, idx) => (
                        <div
                          key={`${photo.profileId}-${idx}`}
                          className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={photo.photoUrl}
                            alt={photo.profileName}
                            className="w-full h-full object-cover group-hover:opacity-75 transition"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23e2e8f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%2364748b' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end p-2">
                            <div className="w-full opacity-0 group-hover:opacity-100 transition bg-black/70 text-white p-2 rounded text-xs">
                              <p className="font-semibold truncate">{photo.profileName}</p>
                              <p className="text-gray-300 truncate">{photo.ownerEmail}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {(photos?.totalPages ?? 0) > 1 && (
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                        <span className="text-xs text-slate-600">
                          Page {(photos?.number ?? 0) + 1} of {photos?.totalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={photoPage === 0}
                            onClick={() => setPhotoPage(Math.max(0, photoPage - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(photoPage + 1) >= (photos?.totalPages ?? 0)}
                            onClick={() => setPhotoPage(photoPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bios Tab */}
          <TabsContent value="bios" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bio Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Search profile names
                    </Label>
                    <Input
                      placeholder="Search by profile name..."
                      value={bioSearch}
                      onChange={(e) => {
                        setBioSearch(e.target.value);
                        setBioPage(0);
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">
                  All Biographies{" "}
                  {bios && <span className="text-slate-500 font-normal">({bios.totalElements})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {biosLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (bios?.content ?? []).length === 0 ? (
                  <p className="text-center text-slate-500 py-12">No biographies found</p>
                ) : (
                  <div className="space-y-4">
                    {bios?.content.map((bio) => (
                      <div key={bio.profileId} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{bio.profileName}</h3>
                            <p className="text-xs text-slate-600">{bio.ownerEmail}</p>
                          </div>
                          <span className="text-xs text-slate-500">{formatDate(bio.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {bio.bio}
                        </p>
                      </div>
                    ))}

                    {/* Pagination */}
                    {(bios?.totalPages ?? 0) > 1 && (
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                        <span className="text-xs text-slate-600">
                          Page {(bios?.number ?? 0) + 1} of {bios?.totalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={bioPage === 0}
                            onClick={() => setBioPage(Math.max(0, bioPage - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(bioPage + 1) >= (bios?.totalPages ?? 0)}
                            onClick={() => setBioPage(bioPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
