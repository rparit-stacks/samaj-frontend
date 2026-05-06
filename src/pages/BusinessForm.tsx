import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { businessApi, type BusinessFormData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";
import { useToast } from "@/hooks/use-toast";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";
import {
  Briefcase, Loader2, X, Phone, Mail, Globe, MapPin,
  Image as ImageIcon, Info,
} from "lucide-react";

const CATEGORIES = [
  "Food & Dining", "Retail", "Services", "Health",
  "Education", "Technology", "Other",
];

interface FormState {
  name: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  website: string;
  photos: string[];
}

const empty: FormState = {
  name: "", description: "", category: "", phone: "",
  email: "", address: "", city: "", website: "", photos: [],
};

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  );
}

export default function BusinessForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [photoUploadKey, setPhotoUploadKey] = useState(0);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["business", "my", id],
    queryFn: () => businessApi.getMine(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        description: existing.description ?? "",
        category: existing.category ?? "",
        phone: existing.phone ?? "",
        email: existing.email ?? "",
        address: existing.address ?? "",
        city: existing.city ?? "",
        website: existing.website ?? "",
        photos: existing.photos ?? [],
      });
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (data: BusinessFormData) => businessApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast({ title: "Submitted for review!", description: "Your listing will go live once approved." });
      navigate("/business/my");
    },
    onError: () => toast({ title: "Failed to create listing", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: BusinessFormData) => businessApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast({ title: "Listing updated", description: "Changes will be reviewed before going live." });
      navigate("/business/my");
    },
    onError: () => toast({ title: "Failed to update listing", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Business name is required";
    if (form.website && !/^https?:\/\/.+/.test(form.website))
      e.website = "Must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: BusinessFormData = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      website: form.website.trim() || undefined,
      photos: form.photos.filter(Boolean),
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  function addPhoto(url: string) {
    if (form.photos.length >= 10) return;
    setForm((f) => ({ ...f, photos: [...f.photos, url] }));
    setPhotoUploadKey((k) => k + 1);
  }

  function removePhoto(idx: number) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isEdit && loadingExisting) {
    return (
      <AppLayout>
        <div className={APP_PAGE_CONTAINER}>
          <div className="space-y-5">
            <Skeleton className="h-8 w-48" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={APP_PAGE_CONTAINER}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {isEdit ? "Edit Listing" : "List Your Business"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Changes go back to review before publishing"
                : "New listings are reviewed before going live"}
            </p>
          </div>
        </div>

        {/* ── BASIC INFO ── */}
        <div className="flex flex-col gap-3">
          <SectionHeading icon={Info} title="Basic info" />

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Business name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Sharma Electronics"
              maxLength={200}
              className={`h-11 rounded-xl ${errors.name ? "border-red-400 focus-visible:ring-red-300" : ""}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Category chips */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: f.category === c ? "" : c }))}
                  className={`px-3.5 py-1.5 rounded-full text-sm border transition-all ${
                    form.category === c
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={set("description")}
              placeholder="Describe your business, products, or services…"
              rows={3}
              maxLength={2000}
              className="rounded-xl resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.description.length}/2000</p>
          </div>
        </div>

        {/* ── CONTACT ── */}
        <div className="flex flex-col gap-3">
          <SectionHeading icon={Phone} title="Contact details" />

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+91 99999 99999"
              maxLength={20}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="business@example.com"
              maxLength={200}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input
              id="website"
              value={form.website}
              onChange={set("website")}
              placeholder="https://yourwebsite.com"
              maxLength={500}
              className={`h-11 rounded-xl ${errors.website ? "border-red-400 focus-visible:ring-red-300" : ""}`}
            />
            {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
          </div>
        </div>

        {/* ── LOCATION ── */}
        <div className="flex flex-col gap-3">
          <SectionHeading icon={MapPin} title="Location" />

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={set("city")}
              placeholder="e.g. Mumbai"
              maxLength={100}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Full address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={set("address")}
              placeholder="Shop no., street, area…"
              rows={2}
              maxLength={500}
              className="rounded-xl resize-none"
            />
          </div>
        </div>

        {/* ── PHOTOS ── */}
        <div className="flex flex-col gap-3">
          <SectionHeading icon={ImageIcon} title={`Photos (${form.photos.length}/10)`} />

          {form.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.photos.length < 10 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 overflow-hidden">
              <ImageUrlWithUpload
                key={photoUploadKey}
                label="Add photo"
                value=""
                onChange={(url) => { if (url) addPhoto(url); }}
                folder="business"
                auth="user"
                optional
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Add up to 10 photos of your business, products, or premises.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 rounded-2xl text-base font-semibold"
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Submit for review"
          )}
        </Button>
      </form>
      </div>
    </AppLayout>
  );
}
