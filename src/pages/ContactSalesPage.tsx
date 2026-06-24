import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ContactSalesPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Request received!",
      description: "Our sales team will get back to you within 1–2 business days.",
    });
    setForm({ name: "", email: "", company: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12 px-4 sm:px-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Contact Sales</h1>
        <p className="text-muted-foreground mb-10">
          Interested in our Enterprise plan? Tell us about your business and we’ll reach out to discuss pricing and features.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sales-name">Your name</Label>
            <Input
              id="sales-name"
              placeholder="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-email">Work email</Label>
            <Input
              id="sales-email"
              type="email"
              placeholder="you@company.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-company">Company / Business name</Label>
            <Input
              id="sales-company"
              placeholder="Your company name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-phone">Phone number</Label>
            <Input
              id="sales-phone"
              type="tel"
              placeholder="+263 77 123 4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-message">Tell us about your needs</Label>
            <Textarea
              id="sales-message"
              placeholder="e.g. expected volume, integrations, dedicated support..."
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full">
            Send request
          </Button>
        </form>

        <div className="mt-12 pt-8 border-t border-border space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Prefer to reach out directly?</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:sales@tengavm.co.zw" className="text-primary hover:underline">
                sales@tenga.com
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <a href="tel:+263771234567" className="text-primary hover:underline">
                +263 77 123 4567
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactSalesPage;
