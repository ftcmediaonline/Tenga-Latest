import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { sendTransactionalEmail } from "@/utils/emailService";

const ContactUsPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { success, error } = await sendTransactionalEmail({
        action: 'contact-us',
        name: form.name,
        email: form.email,
        message: form.message,
      });

      if (success) {
        toast({ title: "Message sent!", description: "We'll get back to you as soon as possible." });
        setForm({ name: "", email: "", message: "" });
      } else {
        toast({ title: "Failed to send message", description: error || "Please try again later.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "An error occurred", description: "Could not send message.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-10">We'd love to hear from you. Reach out anytime.</p>

        <div className="grid md:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="email" placeholder="Your email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Textarea placeholder="Your message" rows={6} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Message
            </Button>
          </form>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-sm text-muted-foreground">support@tenga.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Phone</h3>
                <p className="text-sm text-muted-foreground">+263 77 123 4567</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Address</h3>
                <p className="text-sm text-muted-foreground">14 Samora Machel Avenue, Harare, Zimbabwe</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUsPage;
