import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ExternalLink, Target, Eye, Heart } from "lucide-react";

const committeeMembers = [
  {
    id: "1",
    name: "Shri Mohan Lal Sharma",
    role: "President",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "2",
    name: "Smt. Kamla Devi",
    role: "Vice President",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "3",
    name: "Shri Rajesh Agarwal",
    role: "General Secretary",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "4",
    name: "Shri Vinod Gupta",
    role: "Treasurer",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "5",
    name: "Smt. Sunita Sharma",
    role: "Women's Wing Head",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "6",
    name: "Shri Amit Patel",
    role: "Youth Wing Head",
    tenure: "2024-2026",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  },
];

const milestones = [
  { year: "1952", event: "Foundation of Samaj in Delhi" },
  { year: "1975", event: "First community center established" },
  { year: "1990", event: "Educational trust launched" },
  { year: "2005", event: "Pan-India expansion with 50+ chapters" },
  { year: "2015", event: "Digital platform launched" },
  { year: "2024", event: "25,000+ registered families" },
];

export default function About() {
  return (
    <AppLayout title="About">
      <div className="p-4 md:p-6 space-y-8 md:space-y-12">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-90" />
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=400&fit=crop')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative p-6 md:p-10 text-primary-foreground text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl md:text-4xl font-bold text-secondary-foreground">स</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Samaj Community</h1>
            <p className="text-lg md:text-xl opacity-90 mb-4">United in Heritage, Strong in Unity</p>
            <p className="max-w-2xl mx-auto opacity-80 text-sm md:text-base">
              A vibrant community of over 25,000 families across India, connected by shared values, 
              traditions, and a commitment to mutual support and cultural preservation.
            </p>
          </div>
        </section>

        {/* History Timeline */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Our Journey</h2>
          <div className="relative">
            {/* Timeline line - hidden on mobile */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4 md:space-y-0">
              {milestones.map((milestone, index) => (
                <div 
                  key={milestone.year}
                  className={`flex items-center gap-4 md:gap-0 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Mobile: Simple list */}
                  <div className="md:hidden flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground font-bold">{milestone.year}</span>
                    </div>
                    <p className="text-sm">{milestone.event}</p>
                  </div>

                  {/* Desktop: Alternating sides */}
                  <div className={`hidden md:flex flex-1 ${
                    index % 2 === 0 ? 'justify-end pr-8' : 'justify-start pl-8'
                  }`}>
                    <div className={`bg-card rounded-xl p-4 shadow-card max-w-sm ${
                      index % 2 === 0 ? 'text-right' : 'text-left'
                    }`}>
                      <Badge className="bg-primary mb-2">{milestone.year}</Badge>
                      <p className="font-medium">{milestone.event}</p>
                    </div>
                  </div>
                  
                  {/* Center dot - desktop only */}
                  <div className="hidden md:flex w-4 h-4 rounded-full bg-primary flex-shrink-0 z-10" />
                  
                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission, Vision, Values */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Our Purpose</h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <Card className="bg-card shadow-card border-0">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Mission</h3>
                <p className="text-muted-foreground text-sm">
                  To strengthen community bonds, preserve cultural heritage, and support members 
                  in their personal and professional growth through collaborative initiatives.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-card border-0">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Vision</h3>
                <p className="text-muted-foreground text-sm">
                  A globally connected community that empowers its members while staying rooted 
                  in traditions, creating opportunities for generations to come.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-card border-0">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Values</h3>
                <p className="text-muted-foreground text-sm">
                  Unity, Integrity, Service, Respect for Elders, Cultural Preservation, 
                  Education, and Mutual Support form the pillars of our community.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Committee Members */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Executive Committee</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {committeeMembers.map((member) => (
              <div key={member.id} className="text-center">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto mb-3 ring-4 ring-background shadow-lg">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-sm md:text-base">{member.name}</h3>
                <p className="text-xs md:text-sm text-primary font-medium">{member.role}</p>
                <p className="text-xs text-muted-foreground">{member.tenure}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Contact Us</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Head Office</h3>
                <p className="text-sm text-muted-foreground">
                  401, Heritage Building, 582, MG Road<br />
                  Opposite Hukumchand Ghanta Ghar, New Palasia<br />
                  Indore, Madhya Pradesh 452001, India
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Phone</h3>
                <p className="text-sm text-muted-foreground">
                  <a href="tel:+919111811117" className="hover:text-primary">
                    +91 91118 11117
                  </a>
                  <br />
                  WhatsApp available
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">
                  <a href="mailto:help@suryavanshisamaj.online" className="hover:text-primary">
                    help@suryavanshisamaj.online
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
