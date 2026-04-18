import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Heart, Loader2, Trash2, Upload } from "lucide-react";
import {
  cloudApi,
  matrimonyApi,
  type MatrimonyDrinkingHabit,
  type MatrimonyGender,
  type MatrimonyProfileDetail,
  type MatrimonyProfileSubject,
  type MatrimonySmokingHabit,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

const TOTAL_STEPS = 6;

function applyDetailToForm(d: MatrimonyProfileDetail) {
  return {
    profileSubject: d.profileSubject,
    relativeRelation: d.relativeRelation ?? "",
    displayName: d.displayName,
    gender: d.gender,
    dateOfBirth: d.dateOfBirth?.slice(0, 10) ?? "",
    maritalStatus: d.maritalStatus ?? "",
    heightCm: d.heightCm != null ? String(d.heightCm) : "",
    weightKg: d.weightKg != null ? String(d.weightKg) : "",
    city: d.city ?? "",
    state: d.state ?? "",
    country: d.country ?? "",
    education: d.education ?? "",
    college: d.college ?? "",
    profession: d.profession ?? "",
    company: d.company ?? "",
    incomeBracket: d.incomeBracket ?? "",
    religion: d.religion ?? "",
    caste: d.caste ?? "",
    motherTongue: d.motherTongue ?? "",
    nativePlace: d.nativePlace ?? "",
    familyFather: d.family.father ?? "",
    familyMother: d.family.mother ?? "",
    familySiblings: d.family.siblings ?? "",
    familyType: d.family.familyType ?? "",
    familyValues: d.family.familyValues ?? "",
    smoking: (d.smoking ?? "PREFER_NOT_TO_SAY") as MatrimonySmokingHabit,
    drinking: (d.drinking ?? "PREFER_NOT_TO_SAY") as MatrimonyDrinkingHabit,
    hobbies: (d.hobbies ?? []).join(", "),
    bio: d.bio ?? "",
    partnerAgeMin: d.partnerPreferences.ageMin != null ? String(d.partnerPreferences.ageMin) : "",
    partnerAgeMax: d.partnerPreferences.ageMax != null ? String(d.partnerPreferences.ageMax) : "",
    partnerHeightMinCm:
      d.partnerPreferences.heightMinCm != null ? String(d.partnerPreferences.heightMinCm) : "",
    partnerHeightMaxCm:
      d.partnerPreferences.heightMaxCm != null ? String(d.partnerPreferences.heightMaxCm) : "",
    partnerEducationNote: d.partnerPreferences.educationNote ?? "",
    partnerProfessionNote: d.partnerPreferences.professionNote ?? "",
    partnerLocationNote: d.partnerPreferences.locationNote ?? "",
    partnerOtherExpectations: d.partnerOtherExpectations ?? "",
    photoUrls: [...(d.photoUrls ?? [])],
    primaryPhotoIndex: d.privacy?.primaryPhotoIndex ?? 0,
    step: Math.min(TOTAL_STEPS, Math.max(1, d.draftStep || 1)),
  };
}

export default function MatrimonyProfileWizard() {
  const { profileId } = useParams<{ profileId?: string }>();
  const isNew = !profileId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [localId, setLocalId] = useState<string | null>(profileId ?? null);

  const [profileSubject, setProfileSubject] = useState<MatrimonyProfileSubject>("SELF");
  const [relativeRelation, setRelativeRelation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<MatrimonyGender>("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("");
  const [education, setEducation] = useState("");
  const [college, setCollege] = useState("");
  const [profession, setProfession] = useState("");
  const [company, setCompany] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [religion, setReligion] = useState("");
  const [caste, setCaste] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [familyFather, setFamilyFather] = useState("");
  const [familyMother, setFamilyMother] = useState("");
  const [familySiblings, setFamilySiblings] = useState("");
  const [familyType, setFamilyType] = useState("");
  const [familyValues, setFamilyValues] = useState("");
  const [smoking, setSmoking] = useState<MatrimonySmokingHabit>("PREFER_NOT_TO_SAY");
  const [drinking, setDrinking] = useState<MatrimonyDrinkingHabit>("PREFER_NOT_TO_SAY");
  const [hobbies, setHobbies] = useState("");
  const [bio, setBio] = useState("");
  const [partnerAgeMin, setPartnerAgeMin] = useState("");
  const [partnerAgeMax, setPartnerAgeMax] = useState("");
  const [partnerHeightMinCm, setPartnerHeightMinCm] = useState("");
  const [partnerHeightMaxCm, setPartnerHeightMaxCm] = useState("");
  const [partnerEducationNote, setPartnerEducationNote] = useState("");
  const [partnerProfessionNote, setPartnerProfessionNote] = useState("");
  const [partnerLocationNote, setPartnerLocationNote] = useState("");
  const [partnerOtherExpectations, setPartnerOtherExpectations] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);
  const [photoUrlDraft, setPhotoUrlDraft] = useState("");

  const effectiveId = localId ?? profileId;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["matrimony-profile", effectiveId],
    queryFn: () => matrimonyApi.getProfile(effectiveId!),
    enabled: !!effectiveId && !isNew,
  });

  useEffect(() => {
    if (existing) {
      const f = applyDetailToForm(existing);
      setStep(f.step);
      setProfileSubject(f.profileSubject);
      setRelativeRelation(f.relativeRelation);
      setDisplayName(f.displayName);
      setGender(f.gender);
      setDateOfBirth(f.dateOfBirth);
      setMaritalStatus(f.maritalStatus);
      setHeightCm(f.heightCm);
      setWeightKg(f.weightKg);
      setCity(f.city);
      setStateName(f.state);
      setCountry(f.country);
      setEducation(f.education);
      setCollege(f.college);
      setProfession(f.profession);
      setCompany(f.company);
      setIncomeBracket(f.incomeBracket);
      setReligion(f.religion);
      setCaste(f.caste);
      setMotherTongue(f.motherTongue);
      setNativePlace(f.nativePlace);
      setFamilyFather(f.familyFather);
      setFamilyMother(f.familyMother);
      setFamilySiblings(f.familySiblings);
      setFamilyType(f.familyType);
      setFamilyValues(f.familyValues);
      setSmoking(f.smoking);
      setDrinking(f.drinking);
      setHobbies(f.hobbies);
      setBio(f.bio);
      setPartnerAgeMin(f.partnerAgeMin);
      setPartnerAgeMax(f.partnerAgeMax);
      setPartnerHeightMinCm(f.partnerHeightMinCm);
      setPartnerHeightMaxCm(f.partnerHeightMaxCm);
      setPartnerEducationNote(f.partnerEducationNote);
      setPartnerProfessionNote(f.partnerProfessionNote);
      setPartnerLocationNote(f.partnerLocationNote);
      setPartnerOtherExpectations(f.partnerOtherExpectations);
      setPhotoUrls(f.photoUrls);
      setPrimaryPhotoIndex(f.primaryPhotoIndex);
    }
  }, [existing]);

  const age = useMemo(() => {
    if (!dateOfBirth) return "—";
    const d = new Date(dateOfBirth);
    if (Number.isNaN(d.getTime())) return "—";
    let a = new Date().getFullYear() - d.getFullYear();
    const m = new Date().getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) a--;
    return String(a);
  }, [dateOfBirth]);

  const buildPayloadForStep = (s: number): Record<string, unknown> => {
    const base: Record<string, unknown> = { draftStep: s };
    if (s >= 1) {
      base.displayName = displayName.trim();
      base.gender = gender;
      base.dateOfBirth = dateOfBirth;
      base.profileSubject = profileSubject;
      base.relativeRelation = profileSubject === "RELATIVE" ? relativeRelation.trim() || null : null;
      base.maritalStatus = maritalStatus.trim() || null;
      base.heightCm = heightCm ? parseInt(heightCm, 10) : null;
      base.weightKg = weightKg ? parseInt(weightKg, 10) : null;
      base.city = city.trim() || null;
      base.state = stateName.trim() || null;
      base.country = country.trim() || null;
    }
    if (s >= 2) {
      base.education = education.trim() || null;
      base.college = college.trim() || null;
      base.profession = profession.trim() || null;
      base.company = company.trim() || null;
      base.incomeBracket = incomeBracket.trim() || null;
      base.religion = religion.trim() || null;
      base.caste = caste.trim() || null;
      base.motherTongue = motherTongue.trim() || null;
      base.nativePlace = nativePlace.trim() || null;
    }
    if (s >= 3) {
      base.familyFather = familyFather.trim() || null;
      base.familyMother = familyMother.trim() || null;
      base.familySiblings = familySiblings.trim() || null;
      base.familyType = familyType.trim() || null;
      base.familyValues = familyValues.trim() || null;
    }
    if (s >= 4) {
      base.smoking = smoking;
      base.drinking = drinking;
      base.hobbies = hobbies
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      base.bio = bio.trim() || null;
    }
    if (s >= 5) {
      base.partnerAgeMin = partnerAgeMin ? parseInt(partnerAgeMin, 10) : null;
      base.partnerAgeMax = partnerAgeMax ? parseInt(partnerAgeMax, 10) : null;
      base.partnerHeightMinCm = partnerHeightMinCm ? parseInt(partnerHeightMinCm, 10) : null;
      base.partnerHeightMaxCm = partnerHeightMaxCm ? parseInt(partnerHeightMaxCm, 10) : null;
      base.partnerEducationNote = partnerEducationNote.trim() || null;
      base.partnerProfessionNote = partnerProfessionNote.trim() || null;
      base.partnerLocationNote = partnerLocationNote.trim() || null;
      base.partnerOtherExpectations = partnerOtherExpectations.trim() || null;
    }
    if (s >= 6) {
      base.photoUrls = photoUrls;
      base.primaryPhotoIndex =
        photoUrls.length === 0 ? 0 : Math.min(Math.max(0, primaryPhotoIndex), photoUrls.length - 1);
    }
    return base;
  };

  const saveDraft = async (s: number) => {
    if (isNew && s === 1) {
      if (!displayName.trim() || !dateOfBirth) {
        toast({ title: "Required", description: "Name and date of birth are required", variant: "destructive" });
        return false;
      }
      setSaving(true);
      try {
        const created = await matrimonyApi.createProfile({
          displayName: displayName.trim(),
          gender,
          dateOfBirth,
          profileSubject,
          relativeRelation: profileSubject === "RELATIVE" ? relativeRelation.trim() || undefined : undefined,
          heightCm: heightCm ? parseInt(heightCm, 10) : undefined,
          city: city.trim() || undefined,
          state: stateName.trim() || undefined,
          country: country.trim() || undefined,
        });
        setLocalId(created.id);
        const p1 = buildPayloadForStep(1);
        await matrimonyApi.updateProfile(created.id, { ...p1, draftStep: 2 });
        navigate(`/matrimony/profile/${created.id}/edit`, { replace: true });
        toast({ title: "Draft saved", description: "Continue with the next steps" });
        return true;
      } catch (e) {
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Failed",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    }
    if (!effectiveId) return false;
    setSaving(true);
    try {
      await matrimonyApi.updateProfile(effectiveId, buildPayloadForStep(s));
      toast({ title: "Saved", description: `Step ${s} saved` });
      return true;
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const ok = await saveDraft(step);
    if (ok && step < TOTAL_STEPS) setStep(step + 1);
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const activate = async () => {
    if (!effectiveId) return;
    setSaving(true);
    try {
      await matrimonyApi.updateProfile(effectiveId, buildPayloadForStep(6));
      await matrimonyApi.activateProfile(effectiveId);
      toast({ title: "Profile active", description: "You can browse matches now" });
      navigate("/matrimony", { replace: true });
    } catch (e) {
      toast({
        title: "Could not activate",
        description: e instanceof Error ? e.message : "Add at least one photo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url } = await cloudApi.uploadMatrimonyImage(file);
      setPhotoUrls((p) => [...p, url]);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    }
  };

  if (!isNew && isLoading) {
    return (
      <MatrimonyLayout title="Matrimony profile">
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
        </div>
      </MatrimonyLayout>
    );
  }

  return (
    <MatrimonyLayout title="Matrimony profile">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 pb-24">
        <Link to="/matrimony/my">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            My profiles
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-pink-500" />
          <div>
            <h1 className="text-2xl font-bold">{isNew ? "New profile" : "Edit profile"}</h1>
            <p className="text-sm text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
              {dateOfBirth ? ` · Age ${age}` : ""}
            </p>
          </div>
        </div>

        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />

        {step === 1 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">1. Basic info</h2>
            <div className="space-y-2">
              <Label>Profile for</Label>
              <Select value={profileSubject} onValueChange={(v) => setProfileSubject(v as MatrimonyProfileSubject)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF">Myself</SelectItem>
                  <SelectItem value="RELATIVE">Relative / someone else</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {profileSubject === "RELATIVE" && (
              <div className="space-y-2">
                <Label>Relation</Label>
                <Input value={relativeRelation} onChange={(e) => setRelativeRelation(e.target.value)} placeholder="e.g. sister" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as MatrimonyGender)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Marital status</Label>
              <Input value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} placeholder="Single / Divorced / Widowed" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={stateName} onChange={(e) => setStateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">2. Personal details</h2>
            <div className="space-y-2">
              <Label>Education</Label>
              <Input value={education} onChange={(e) => setEducation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>College / institute</Label>
              <Input value={college} onChange={(e) => setCollege(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Profession</Label>
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Income (range / bracket)</Label>
              <Input value={incomeBracket} onChange={(e) => setIncomeBracket(e.target.value)} placeholder="e.g. 8–15 LPA" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Religion</Label>
                <Input value={religion} onChange={(e) => setReligion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Caste (optional)</Label>
                <Input value={caste} onChange={(e) => setCaste(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mother tongue</Label>
              <Input value={motherTongue} onChange={(e) => setMotherTongue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Native place</Label>
              <Input value={nativePlace} onChange={(e) => setNativePlace(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">3. Family</h2>
            <div className="space-y-2">
              <Label>Father / occupation</Label>
              <Input value={familyFather} onChange={(e) => setFamilyFather(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mother / occupation</Label>
              <Input value={familyMother} onChange={(e) => setFamilyMother(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Siblings</Label>
              <Input value={familySiblings} onChange={(e) => setFamilySiblings(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Family type</Label>
              <Input value={familyType} onChange={(e) => setFamilyType(e.target.value)} placeholder="Nuclear / Joint" />
            </div>
            <div className="space-y-2">
              <Label>Family values</Label>
              <Textarea value={familyValues} onChange={(e) => setFamilyValues(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">4. Lifestyle</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Smoking</Label>
                <Select value={smoking} onValueChange={(v) => setSmoking(v as MatrimonySmokingHabit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="OCCASIONALLY">Occasionally</SelectItem>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Drinking</Label>
                <Select value={drinking} onValueChange={(v) => setDrinking(v as MatrimonyDrinkingHabit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="OCCASIONALLY">Occasionally</SelectItem>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hobbies (comma separated)</Label>
              <Input value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="Reading, travel…" />
            </div>
            <div className="space-y-2">
              <Label>About me</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">5. Partner preferences</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Partner age min</Label>
                <Input type="number" value={partnerAgeMin} onChange={(e) => setPartnerAgeMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Partner age max</Label>
                <Input type="number" value={partnerAgeMax} onChange={(e) => setPartnerAgeMax(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Partner height min (cm)</Label>
                <Input type="number" value={partnerHeightMinCm} onChange={(e) => setPartnerHeightMinCm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Partner height max (cm)</Label>
                <Input type="number" value={partnerHeightMaxCm} onChange={(e) => setPartnerHeightMaxCm(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location preference</Label>
              <Input value={partnerLocationNote} onChange={(e) => setPartnerLocationNote(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Education preference</Label>
              <Input value={partnerEducationNote} onChange={(e) => setPartnerEducationNote(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Profession preference</Label>
              <Input value={partnerProfessionNote} onChange={(e) => setPartnerProfessionNote(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Other expectations</Label>
              <Textarea value={partnerOtherExpectations} onChange={(e) => setPartnerOtherExpectations(e.target.value)} rows={4} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 bg-card rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold">6. Photos</h2>
            <p className="text-sm text-muted-foreground">Add at least one photo. Tap a photo to set as primary (profile picture).</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <ImageUrlWithUpload
                id="matrimony-photo-url-draft"
                label="Add photo from URL"
                optional
                value={photoUrlDraft}
                onChange={setPhotoUrlDraft}
                folder="matrimony"
                auth="user"
                helperText="Upload or paste a direct image URL, then add it to your album."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!photoUrlDraft.trim()}
                onClick={() => {
                  const u = photoUrlDraft.trim();
                  if (!u) return;
                  setPhotoUrls((p) => [...p, u]);
                  setPhotoUrlDraft("");
                }}
              >
                Add URL to album
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <div
                  key={url}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer ${primaryPhotoIndex === i ? "border-pink-500" : "border-transparent"}`}
                  onClick={() => setPrimaryPhotoIndex(i)}
                >
                  <img src={url} alt="" className="aspect-square object-cover w-full" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoUrls((p) => p.filter((_, j) => j !== i));
                      if (primaryPhotoIndex >= photoUrls.length - 1) setPrimaryPhotoIndex(0);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {primaryPhotoIndex === i && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-pink-600 text-white px-1 rounded">Primary</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-between sticky bottom-4 bg-background/95 py-2 border-t">
          <Button type="button" variant="outline" onClick={back} disabled={step === 1 || saving}>
            Back
          </Button>
          <div className="flex gap-2">
            {step < TOTAL_STEPS ? (
              <Button type="button" onClick={next} disabled={saving} className="bg-pink-600">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => saveDraft(6)} disabled={saving}>
                  Save draft
                </Button>
                <Button type="button" onClick={activate} disabled={saving || photoUrls.length === 0} className="bg-pink-600">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit & activate"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </MatrimonyLayout>
  );
}
