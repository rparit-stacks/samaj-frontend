import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Droplets, Search, Heart, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { emergencyApi, type EmergencyItem } from "@/lib/api";

const emergencyTypes = [
  { id: "BLOOD", label: "Blood Required", icon: Droplets },
  { id: "MEDICAL", label: "Medical Emergency", icon: Heart },
  { id: "ACCIDENT", label: "Accident / Trauma", icon: Search },
  { id: "OTHER", label: "Other Emergency", icon: HelpCircle },
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function CreateEmergencyPage() {
  const [emergencyType, setEmergencyType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [landmark, setLandmark] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!title || !description || !city || !state || !country) return;

    try {
      setSubmitting(true);
      const finalDescription =
        emergencyType === "BLOOD" && bloodGroup
          ? `${description}\n\nBlood group required: ${bloodGroup}`
          : description;

      const created: EmergencyItem = await emergencyApi.create({
        type: emergencyType || "OTHER",
        title,
        description: finalDescription,
        area: area || undefined,
        city,
        state,
        country,
        landmark: landmark || undefined,
        locationDescription: locationDescription || undefined,
        emergencyAt: new Date().toISOString(),
        contactPhone: contactPhone || undefined,
        contactWhatsapp: contactWhatsapp || undefined,
        contactEmail: contactEmail || undefined,
        allowPhone: !!contactPhone,
        allowWhatsapp: !!contactWhatsapp,
        allowEmail: !!contactEmail,
      });

      toast({
        title: "Emergency Alert Created",
        description: "Your emergency has been posted to the community.",
      });

      navigate("/emergency", { state: { createdEmergencyId: created.id } });
    } catch (err: any) {
      toast({
        title: "Failed to create emergency",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Create Emergency">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emergency/10 text-emergency">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Report an Emergency</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in the details below. Please only use this for genuine, urgent situations.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-4 md:p-6 space-y-5">
          {/* Emergency Type */}
          <div className="space-y-2">
            <Label>Emergency Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {emergencyTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setEmergencyType(type.id)}
                  className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 transition-all text-left w-full ${
                    emergencyType === type.id
                      ? "border-emergency bg-emergency/5"
                      : "border-border hover:border-emergency/50"
                  }`}
                >
                  <type.icon
                    className={`h-5 w-5 ${
                      emergencyType === type.id ? "text-emergency" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      emergencyType === type.id ? "text-emergency" : ""
                    }`}
                  >
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Blood Group (if blood type selected) */}
          {emergencyType === "BLOOD" && (
            <div className="space-y-2">
              <Label>Blood Group Required</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {bloodGroups.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="emergency-title">Title</Label>
            <Input
              id="emergency-title"
              placeholder="Brief description of emergency"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="emergency-desc">Details</Label>
            <Textarea
              id="emergency-desc"
              placeholder="Provide full details about the emergency..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <Input
                placeholder="City *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                placeholder="State *"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                placeholder="Country *"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <Input
                placeholder="Landmark (optional)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Location description */}
          <div className="space-y-2">
            <Label htmlFor="emergency-location">Location details</Label>
            <Input
              id="emergency-location"
              placeholder="Hospital name, floor, room number, directions"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
            />
          </div>

          {/* Contact options */}
          <div className="space-y-3">
            <Label>Contact options</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="emergency-contact-phone">Call number</Label>
                <Input
                  id="emergency-contact-phone"
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergency-contact-whatsapp">WhatsApp number</Label>
                <Input
                  id="emergency-contact-whatsapp"
                  placeholder="+91 98765 43210"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergency-contact-email">Email</Label>
                <Input
                  id="emergency-contact-email"
                  placeholder="example@gmail.com"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="emergency"
              onClick={handleSubmit}
              disabled={submitting || !title || !description || !city || !state || !country}
            >
              {submitting ? "Posting..." : "Post Emergency"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

